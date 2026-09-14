import { describe, it, expect } from "vitest";
import {
  chunkAllowedForViewer,
  sourcesFromChunks,
  buildContextText,
  extractQueryTerms,
} from "./rag";
import { makeViewer, type Viewer } from "./visibility";
import type { RetrievedChunk } from "./rag";

// Betrachter-Fixtures über die echte Rechte-Auflösung (DEFAULT_ROLE_PRESETS).
const anon: Viewer | null = null;
const guest = makeViewer(10, ["guest"]); // nur content.follow
const player = makeViewer(20, ["player"]); // kein view_all
const gm = makeViewer(30, ["gm"]); // kein view_all
const admin = makeViewer(40, ["admin"]); // content.view_all

function row(
  over: Partial<{
    ownerId: number | null;
    isDraft: boolean;
    isActive: boolean;
  }> = {},
) {
  return {
    ownerId: null as number | null,
    isDraft: false,
    isActive: true,
    ...over,
  };
}

describe("chunkAllowedForViewer — is_active", () => {
  it("inaktive Chunks sind für niemanden sichtbar (auch nicht Admin)", () => {
    expect(chunkAllowedForViewer(row({ isActive: false }), admin)).toBe(false);
    expect(chunkAllowedForViewer(row({ isActive: false }), null)).toBe(false);
  });
});

describe("chunkAllowedForViewer — veröffentlicht", () => {
  it("Veröffentlichtes ist für alle sichtbar, auch anonym", () => {
    expect(chunkAllowedForViewer(row(), anon)).toBe(true);
    expect(chunkAllowedForViewer(row(), guest)).toBe(true);
    expect(chunkAllowedForViewer(row({ ownerId: 99 }), player)).toBe(true);
  });
});

describe("chunkAllowedForViewer — Entwürfe", () => {
  it("einen fremden Entwurf sieht weder anonym noch ein Spieler noch die Spielleitung", () => {
    expect(chunkAllowedForViewer(row({ isDraft: true, ownerId: 99 }), anon)).toBe(false);
    expect(chunkAllowedForViewer(row({ isDraft: true, ownerId: 99 }), player)).toBe(false);
    expect(chunkAllowedForViewer(row({ isDraft: true, ownerId: 99 }), gm)).toBe(false);
  });

  it("den eigenen Entwurf sieht der Owner", () => {
    expect(
      chunkAllowedForViewer(row({ isDraft: true, ownerId: player.userId }), player),
    ).toBe(true);
  });

  it("einen fremden Entwurf sieht, wer content.view_all hat", () => {
    // Der eine Bypass — die Administration muss Inhalte auch verwalten
    // können; im RAG-Kontext heißt das: sie darf sie auch zitiert bekommen.
    expect(chunkAllowedForViewer(row({ isDraft: true, ownerId: 99 }), admin)).toBe(true);
  });
});

function chunk(over: Partial<RetrievedChunk>): RetrievedChunk {
  return {
    contentType: "character",
    contentId: 1,
    chunkText: "…",
    title: "Titel",
    slug: "slug",
    href: "/x",
    distance: 0.1,
    ...over,
  };
}

describe("sourcesFromChunks", () => {
  it("dedupliziert je Inhalt (content_type + id)", () => {
    const sources = sourcesFromChunks([
      chunk({ contentType: "character", contentId: 1, title: "Kirk", href: "/characters/kirk" }),
      chunk({ contentType: "character", contentId: 1, title: "Kirk", href: "/characters/kirk" }),
      chunk({ contentType: "mission", contentId: 1, title: "Mission", href: "/chronologie/mission/m" }),
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[0]).toEqual({ contentType: "character", title: "Kirk", href: "/characters/kirk" });
  });

  it("fällt bei fehlendem Titel auf 'Unbenannt' zurück", () => {
    const sources = sourcesFromChunks([chunk({ title: null })]);
    expect(sources[0].title).toBe("Unbenannt");
  });
});

describe("extractQueryTerms", () => {
  it("zieht inhaltstragende Begriffe, ohne Stoppwörter/kurze Wörter", () => {
    const terms = extractQueryTerms("Was wissen wir über die Tholianer und ihre Schiffe?");
    expect(terms).toContain("tholianer");
    expect(terms).toContain("schiffe");
    // Stoppwörter/kurze Wörter fallen raus.
    expect(terms).not.toContain("was");
    expect(terms).not.toContain("wir");
    expect(terms).not.toContain("die");
  });

  it("dedupliziert und begrenzt auf 8 Begriffe", () => {
    const terms = extractQueryTerms(
      "Alpha Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa",
    );
    expect(terms.length).toBeLessThanOrEqual(8);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("liefert für eine floskelhafte Frage ohne Inhaltswörter eine leere Liste", () => {
    expect(extractQueryTerms("Wer war das?")).toEqual([]);
  });
});

describe("buildContextText", () => {
  it("nummeriert die Chunks und trennt sie", () => {
    const text = buildContextText([
      chunk({ title: "A", chunkText: "Text A" }),
      chunk({ contentId: 2, title: "B", chunkText: "Text B" }),
    ]);
    expect(text).toContain("[1] A");
    expect(text).toContain("[2] B");
    expect(text).toContain("Text A");
    expect(text).toContain("---");
  });

  it("leerer Kontext meldet keinen Treffer", () => {
    expect(buildContextText([])).toContain("Kein passender");
  });
});

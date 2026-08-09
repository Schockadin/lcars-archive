import { describe, it, expect } from "vitest";
import { chunkAllowedForViewer, sourcesFromChunks, buildContextText } from "./rag";
import { makeViewer, type Viewer } from "./visibility";
import type { RetrievedChunk } from "./rag";

// Betrachter-Fixtures über die echte Rechte-Auflösung (DEFAULT_ROLE_PRESETS).
const anon: Viewer | null = null;
const guest = makeViewer(10, ["guest"]); // nur content.follow
const player = makeViewer(20, ["player"]); // kein view_gm/view_all
const gm = makeViewer(30, ["gm"]); // content.view_gm
const admin = makeViewer(40, ["admin"]); // content.view_all

function row(
  over: Partial<{
    visibility: "private" | "gm" | "public";
    ownerId: number | null;
    isDraft: boolean;
    isActive: boolean;
  }> = {},
) {
  return {
    visibility: "public" as const,
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

describe("chunkAllowedForViewer — public", () => {
  it("public ist für alle sichtbar, auch anonym", () => {
    expect(chunkAllowedForViewer(row({ visibility: "public" }), anon)).toBe(true);
    expect(chunkAllowedForViewer(row({ visibility: "public" }), guest)).toBe(true);
  });
});

describe("chunkAllowedForViewer — private", () => {
  it("private sieht anonym/fremd nicht", () => {
    expect(chunkAllowedForViewer(row({ visibility: "private", ownerId: 99 }), anon)).toBe(false);
    expect(chunkAllowedForViewer(row({ visibility: "private", ownerId: 99 }), player)).toBe(false);
  });

  it("private sieht der Owner", () => {
    expect(
      chunkAllowedForViewer(row({ visibility: "private", ownerId: player.userId }), player),
    ).toBe(true);
  });

  it("private sieht, wer content.view_all hat (Admin-Bypass)", () => {
    expect(chunkAllowedForViewer(row({ visibility: "private", ownerId: 99 }), admin)).toBe(true);
  });

  it("GM (nur view_gm) sieht fremde private NICHT", () => {
    expect(chunkAllowedForViewer(row({ visibility: "private", ownerId: 99 }), gm)).toBe(false);
  });
});

describe("chunkAllowedForViewer — gm-Sichtbarkeit", () => {
  it("gm-Inhalt sieht, wer content.view_gm hat", () => {
    expect(chunkAllowedForViewer(row({ visibility: "gm", ownerId: 99 }), gm)).toBe(true);
    expect(chunkAllowedForViewer(row({ visibility: "gm", ownerId: 99 }), admin)).toBe(true);
  });

  it("gm-Inhalt sieht ein normaler Spieler NICHT", () => {
    expect(chunkAllowedForViewer(row({ visibility: "gm", ownerId: 99 }), player)).toBe(false);
    expect(chunkAllowedForViewer(row({ visibility: "gm", ownerId: 99 }), anon)).toBe(false);
  });

  it("gm-Inhalt sieht der Owner immer (auch ohne view_gm)", () => {
    expect(
      chunkAllowedForViewer(row({ visibility: "gm", ownerId: player.userId }), player),
    ).toBe(true);
  });
});

describe("chunkAllowedForViewer — Entwürfe", () => {
  it("Entwurf sieht NUR der Owner — kein Admin-Bypass", () => {
    expect(
      chunkAllowedForViewer(row({ isDraft: true, visibility: "public", ownerId: 99 }), admin),
    ).toBe(false);
    expect(
      chunkAllowedForViewer(row({ isDraft: true, visibility: "public", ownerId: 99 }), gm),
    ).toBe(false);
  });

  it("Entwurf sieht der Owner", () => {
    expect(
      chunkAllowedForViewer(
        row({ isDraft: true, visibility: "public", ownerId: player.userId }),
        player,
      ),
    ).toBe(true);
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
      chunk({ contentType: "mission", contentId: 1, title: "Mission", href: "/missions/m" }),
    ]);
    expect(sources).toHaveLength(2);
    expect(sources[0]).toEqual({ contentType: "character", title: "Kirk", href: "/characters/kirk" });
  });

  it("fällt bei fehlendem Titel auf 'Unbenannt' zurück", () => {
    const sources = sourcesFromChunks([chunk({ title: null })]);
    expect(sources[0].title).toBe("Unbenannt");
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

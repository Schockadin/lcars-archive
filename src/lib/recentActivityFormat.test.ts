import { describe, it, expect } from "vitest";
import {
  computeNewsItems,
  newsVisibility,
  toHref,
  type NewsContentRow,
  type NewsDeletionRow,
} from "./recentActivityFormat";
import { resolvePermissions } from "./permissions";

const SINCE = new Date("2026-01-01T00:00:00Z");

function contentRow(overrides: Partial<NewsContentRow> = {}): NewsContentRow {
  return {
    target_type: "character",
    slug: "kirk",
    title: "Kirk",
    mission_slug: null,
    dialogue_open: null,
    author_name: "Spieler A",
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

const ALL_KINDS = ["created", "updated", "deleted"];

describe("toHref", () => {
  it("baut Pfade je Inhaltstyp", () => {
    expect(toHref(contentRow({ target_type: "character", slug: "kirk" }))).toBe(
      "/characters/kirk",
    );
    expect(toHref(contentRow({ target_type: "mission", slug: "m1" }))).toBe(
      "/missions/m1",
    );
    expect(
      toHref(
        contentRow({
          target_type: "mission_log",
          slug: "log1",
          mission_slug: "m1",
        }),
      ),
    ).toBe("/missions/m1/log1");
  });

  it("verlinkt offene Dialoge auf /dialogues, geschlossene auf /archive", () => {
    expect(
      toHref(
        contentRow({ target_type: "archive_entry", slug: "d1", dialogue_open: true }),
      ),
    ).toBe("/dialogues/d1");
    expect(
      toHref(
        contentRow({ target_type: "archive_entry", slug: "e1", dialogue_open: false }),
      ),
    ).toBe("/archive/e1");
  });
});

describe("computeNewsItems", () => {
  it("gibt für einen neuen, ungesehenen Inhalt eine created-News zurück", () => {
    const items = computeNewsItems({
      contentRows: [contentRow()],
      deletionRows: [],
      seenEntries: [],
      newsKinds: ALL_KINDS,
      since: SINCE,
    });
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("created");
    expect(items[0].targetKey).toBe("kirk");
    expect(items[0].href).toBe("/characters/kirk");
  });

  it("erzeugt für einen später bearbeiteten Inhalt created UND updated", () => {
    const items = computeNewsItems({
      contentRows: [
        contentRow({
          created_at: "2026-06-01T10:00:00Z",
          updated_at: "2026-06-10T10:00:00Z",
        }),
      ],
      deletionRows: [],
      seenEntries: [],
      newsKinds: ALL_KINDS,
      since: SINCE,
    });
    expect(items.map((i) => i.kind).sort()).toEqual(["created", "updated"]);
    // Neueste zuerst: updated (10.06.) vor created (01.06.).
    expect(items[0].kind).toBe("updated");
  });

  it("erzeugt keine updated-News, wenn nie bearbeitet wurde", () => {
    const items = computeNewsItems({
      contentRows: [contentRow()],
      deletionRows: [],
      seenEntries: [],
      newsKinds: ["updated"],
      since: SINCE,
    });
    expect(items).toHaveLength(0);
  });

  it("blendet Inhalte aus, deren Erstellung vor dem Zeitfenster liegt", () => {
    const items = computeNewsItems({
      contentRows: [
        contentRow({
          created_at: "2025-06-01T10:00:00Z",
          updated_at: "2025-06-01T10:00:00Z",
        }),
      ],
      deletionRows: [],
      seenEntries: [],
      newsKinds: ALL_KINDS,
      since: SINCE,
    });
    expect(items).toHaveLength(0);
  });

  it("blendet eine als gesehen markierte created-News aus", () => {
    const items = computeNewsItems({
      contentRows: [contentRow()],
      deletionRows: [],
      seenEntries: [
        { targetType: "character", targetKey: "kirk", seenAt: "2026-06-01T10:00:00Z" },
      ],
      newsKinds: ALL_KINDS,
      since: SINCE,
    });
    expect(items).toHaveLength(0);
  });

  it("zeigt eine spätere Bearbeitung wieder an, obwohl die Erstellung gesehen wurde", () => {
    const items = computeNewsItems({
      contentRows: [
        contentRow({
          created_at: "2026-06-01T10:00:00Z",
          updated_at: "2026-06-20T10:00:00Z",
        }),
      ],
      deletionRows: [],
      // gesehen bis 01.06. — die Bearbeitung am 20.06. ist neuer.
      seenEntries: [
        { targetType: "character", targetKey: "kirk", seenAt: "2026-06-01T10:00:00Z" },
      ],
      newsKinds: ALL_KINDS,
      since: SINCE,
    });
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("updated");
  });

  it("respektiert die gewählten News-Arten", () => {
    const rows = [
      contentRow({
        created_at: "2026-06-01T10:00:00Z",
        updated_at: "2026-06-10T10:00:00Z",
      }),
    ];
    const onlyCreated = computeNewsItems({
      contentRows: rows,
      deletionRows: [],
      seenEntries: [],
      newsKinds: ["created"],
      since: SINCE,
    });
    expect(onlyCreated.map((i) => i.kind)).toEqual(["created"]);

    const none = computeNewsItems({
      contentRows: rows,
      deletionRows: [],
      seenEntries: [],
      newsKinds: [],
      since: SINCE,
    });
    expect(none).toHaveLength(0);
  });

  it("nimmt Löschungen auf (ohne href) und filtert gesehene aus", () => {
    const deletionRows: NewsDeletionRow[] = [
      {
        id: 7,
        target_type: "mission",
        title: "Alte Mission",
        deleted_at: "2026-06-05T10:00:00Z",
        deleted_by_name: "Admin",
      },
    ];
    const shown = computeNewsItems({
      contentRows: [],
      deletionRows,
      seenEntries: [],
      newsKinds: ["deleted"],
      since: SINCE,
    });
    expect(shown).toHaveLength(1);
    expect(shown[0].kind).toBe("deleted");
    expect(shown[0].href).toBeNull();
    expect(shown[0].targetKey).toBe("7");

    const hidden = computeNewsItems({
      contentRows: [],
      deletionRows,
      seenEntries: [
        { targetType: "deletion", targetKey: "7", seenAt: "2026-06-05T10:00:00Z" },
      ],
      newsKinds: ["deleted"],
      since: SINCE,
    });
    expect(hidden).toHaveLength(0);
  });

  it("sortiert absteigend nach Zeitstempel", () => {
    const items = computeNewsItems({
      contentRows: [
        contentRow({ slug: "a", created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" }),
        contentRow({ slug: "b", created_at: "2026-06-15T00:00:00Z", updated_at: "2026-06-15T00:00:00Z" }),
      ],
      deletionRows: [],
      seenEntries: [],
      newsKinds: ["created"],
      since: SINCE,
    });
    expect(items.map((i) => i.targetKey)).toEqual(["b", "a"]);
  });
});

describe("newsVisibility", () => {
  it("leitet die gm-Sichtbarkeit aus einer ZUSATZrolle ab, nicht aus der Primärrolle", () => {
    // Dokumentierter Multi-Rollen-Fall: Primärrolle „player", Zusatzrolle „gm".
    // Der frühere role-String-Check (viewerRole === "gm") war hier false und
    // hätte gm-Inhalte im News-Feed fälschlich ausgeblendet.
    const perms = resolvePermissions(["player", "gm"], null);
    expect(newsVisibility(perms)).toEqual({ canViewGm: true, canViewAll: false });
  });

  it("berücksichtigt einen Override, der content.view_all gewährt", () => {
    const perms = resolvePermissions(["player"], { "content.view_all": true });
    expect(newsVisibility(perms).canViewAll).toBe(true);
  });

  it("berücksichtigt einen Override, der content.view_gm entzieht", () => {
    const perms = resolvePermissions(["gm"], { "content.view_gm": false });
    expect(newsVisibility(perms).canViewGm).toBe(false);
  });

  it("ein reiner Spieler sieht weder gm- noch alle Inhalte", () => {
    const perms = resolvePermissions(["player"], null);
    expect(newsVisibility(perms)).toEqual({ canViewGm: false, canViewAll: false });
  });
});

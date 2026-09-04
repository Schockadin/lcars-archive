import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: () => Promise.resolve([]) }));

const { countDialoguePartners, relationWeight } = await import("./relations");

const p = (kind: string, slug: string, name = slug) => ({ kind, slug, name });

describe("countDialoguePartners", () => {
  it("zählt Mitteilnehmer und lässt die Figur selbst weg", () => {
    const rows = [
      { participants: [p("character", "tuvok"), p("character", "quark")] },
    ];
    const out = countDialoguePartners(rows, "tuvok");
    expect([...out.keys()]).toEqual(["quark"]);
    expect(out.get("quark")?.count).toBe(1);
  });

  it("summiert über mehrere Gespräche", () => {
    const rows = [
      { participants: [p("character", "tuvok"), p("character", "quark")] },
      { participants: [p("character", "tuvok"), p("character", "quark")] },
      { participants: [p("character", "tuvok"), p("archive", "sareth")] },
    ];
    const out = countDialoguePartners(rows, "tuvok");
    expect(out.get("quark")?.count).toBe(2);
    expect(out.get("sareth")?.count).toBe(1);
  });

  it("unterscheidet Charaktere von Archiv-NPCs", () => {
    const rows = [
      { participants: [p("character", "tuvok"), p("archive", "quark-npc")] },
    ];
    const out = countDialoguePartners(rows, "tuvok");
    expect(out.get("quark-npc")?.kind).toBe("npc");
  });

  it("überspringt Gespräche ohne die eigene Figur", () => {
    const rows = [
      { participants: [p("character", "quark"), p("character", "sareth")] },
    ];
    expect(countDialoguePartners(rows, "tuvok").size).toBe(0);
  });

  it("verträgt fehlende oder kaputte Teilnehmerlisten", () => {
    const rows = [
      { participants: null },
      { participants: [] },
      // Einträge ohne slug dürfen nicht als Partner auftauchen.
      { participants: [p("character", "tuvok"), { kind: "character" } as never] },
    ];
    expect(countDialoguePartners(rows, "tuvok").size).toBe(0);
  });

  it("fällt auf den Slug zurück, wenn der Name fehlt", () => {
    const rows = [
      {
        participants: [
          p("character", "tuvok"),
          { kind: "character", slug: "namenlos" } as never,
        ],
      },
    ];
    expect(countDialoguePartners(rows, "tuvok").get("namenlos")?.name).toBe(
      "namenlos",
    );
  });
});

describe("relationWeight", () => {
  it("summiert Missionen und Gespräche", () => {
    expect(
      relationWeight({
        slug: "x",
        name: "X",
        kind: "character",
        href: "/characters/x",
        sharedMissions: 2,
        sharedDialogues: 3,
      }),
    ).toBe(5);
  });
});

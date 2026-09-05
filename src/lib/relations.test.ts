import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: () => Promise.resolve([]) }));

const { countDialoguePartners, relationWeight, collectDialogueEdges, edgeKey } =
  await import("./relations");

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

describe("edgeKey", () => {
  // Je Paar genau EIN Schlüssel, egal in welcher Reihenfolge die beiden
  // Quellen (Missionen/Gespräche) sie liefern — sonst stünde dieselbe
  // Verbindung zweimal im Graphen.
  it("ist unabhängig von der Reihenfolge", () => {
    expect(edgeKey("b", "a")).toBe(edgeKey("a", "b"));
    expect(edgeKey("a", "b")).toBe("a|b");
  });
});

describe("collectDialogueEdges", () => {
  it("bildet aus einem Gespräch alle Paare der Teilnehmenden", () => {
    const { pairs, nodes } = collectDialogueEdges([
      {
        participants: [
          p("character", "tuvok"),
          p("character", "quark"),
          p("npc", "sareth"),
        ],
      },
    ]);
    expect([...pairs.keys()].sort()).toEqual([
      "quark|sareth",
      "quark|tuvok",
      "sareth|tuvok",
    ]);
    expect(nodes.get("sareth")?.kind).toBe("npc");
    expect(nodes.get("sareth")?.href).toBe("/archive/sareth");
    expect(nodes.get("tuvok")?.href).toBe("/characters/tuvok");
  });

  it("summiert dasselbe Paar über mehrere Gespräche", () => {
    const rows = [
      { participants: [p("character", "tuvok"), p("character", "quark")] },
      { participants: [p("character", "quark"), p("character", "tuvok")] },
    ];
    expect(collectDialogueEdges(rows).pairs.get("quark|tuvok")).toBe(2);
  });

  // Ein doppelt eingetragener Teilnehmer ergäbe sonst ein Paar mit sich
  // selbst und eine doppelte Zählung.
  it("ignoriert doppelte Teilnehmer innerhalb eines Gesprächs", () => {
    const { pairs } = collectDialogueEdges([
      {
        participants: [
          p("character", "tuvok"),
          p("character", "tuvok"),
          p("character", "quark"),
        ],
      },
    ]);
    expect([...pairs.entries()]).toEqual([["quark|tuvok", 1]]);
  });

  it("überspringt Einträge ohne Slug und leere Gespräche", () => {
    const { pairs, nodes } = collectDialogueEdges([
      { participants: [{ kind: "character", name: "Ohne Slug" }] },
      { participants: null },
      { participants: [] },
    ]);
    expect(pairs.size).toBe(0);
    expect(nodes.size).toBe(0);
  });

  it("legt bei einem einzelnen Teilnehmer keine Kante an", () => {
    const { pairs, nodes } = collectDialogueEdges([
      { participants: [p("character", "tuvok")] },
    ]);
    expect(pairs.size).toBe(0);
    expect(nodes.size).toBe(1);
  });
});

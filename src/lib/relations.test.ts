import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: () => Promise.resolve([]) }));

const {
  countDialoguePartners,
  relationWeight,
  edgeKey,
  buildLinkLookup,
  resolveLinkTarget,
  linkedSlugsOf,
  collectLinkEdges,
} = await import("./relations");

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
  it("summiert Missionen, Gespräche und Verlinkungen", () => {
    expect(
      relationWeight({
        slug: "x",
        name: "X",
        kind: "character",
        href: "/characters/x",
        sharedMissions: 2,
        sharedDialogues: 3,
        sharedLinks: 1,
      }),
    ).toBe(6);
  });
});

describe("edgeKey", () => {
  // Je Paar genau EIN Schlüssel, egal in welcher Reihenfolge die Verweise
  // ihn liefern — sonst zählte dieselbe Verbindung zweimal.
  it("ist unabhängig von der Reihenfolge", () => {
    expect(edgeKey("b", "a")).toBe(edgeKey("a", "b"));
    expect(edgeKey("a", "b")).toBe("a|b");
  });
});

// ── Verlinkungen ───────────────────────────────────────────────────────
const lookup = () =>
  buildLinkLookup([
    { slug: "tuvok", name: "Tuvok" },
    { slug: "t-mok", name: "T'Mok" },
    { slug: "sareth", name: "Wirtin Sareth" },
  ]);

describe("resolveLinkTarget", () => {
  it("findet ein Ziel über den Anzeigenamen, Groß-/Kleinschreibung egal", () => {
    expect(resolveLinkTarget("Wirtin Sareth", lookup())).toBe("sareth");
    expect(resolveLinkTarget("  wirtin sareth ", lookup())).toBe("sareth");
  });

  // Wie beim Rendern (resolveAllWikilinks): erst der Titel, dann der Slug.
  it("fällt auf den Slug zurück", () => {
    expect(resolveLinkTarget("T'Mok", lookup())).toBe("t-mok");
    expect(resolveLinkTarget("t-mok", lookup())).toBe("t-mok");
  });

  it("liefert null für ein unbekanntes Ziel", () => {
    expect(resolveLinkTarget("Irgendwas", lookup())).toBeNull();
  });
});

describe("buildLinkLookup", () => {
  // Die Aufrufer reichen Charaktere vor NPCs hinein — bei gleichem Namen
  // gewinnt deshalb der zuerst eingetragene Knoten.
  it("lässt bei gleichem Namen den ersten Knoten gewinnen", () => {
    const l = buildLinkLookup([
      { slug: "sareth", name: "Sareth" },
      { slug: "sareth-npc", name: "Sareth" },
    ]);
    expect(resolveLinkTarget("Sareth", l)).toBe("sareth");
    expect(resolveLinkTarget("sareth-npc", l)).toBe("sareth-npc");
  });
});

describe("linkedSlugsOf", () => {
  it("liest Wikilinks aus dem Fließtext", () => {
    expect(
      linkedSlugsOf(
        {
          slug: "kira",
          sourceMd: "Traf [[Tuvok]] und später [[Wirtin Sareth|die Wirtin]].",
        },
        lookup(),
      ).sort(),
    ).toEqual(["sareth", "tuvok"]);
  });

  it("zählt denselben Link im selben Text nur einmal", () => {
    expect(
      linkedSlugsOf(
        { slug: "kira", sourceMd: "[[Tuvok]], [[Tuvok]], nochmal [[tuvok]]." },
        lookup(),
      ),
    ).toEqual(["tuvok"]);
  });

  it("lässt den Verweis auf sich selbst weg", () => {
    expect(
      linkedSlugsOf(
        { slug: "tuvok", sourceMd: "[[Tuvok]] denkt über [[Tuvok]] nach." },
        lookup(),
      ),
    ).toEqual([]);
  });

  it("ignoriert Links auf Unbekanntes (Missionen, tote Links)", () => {
    expect(
      linkedSlugsOf(
        { slug: "kira", sourceMd: "Siehe [[Die lange Nacht]]." },
        lookup(),
      ),
    ).toEqual([]);
  });

  it("nimmt strukturierte Verweise dazu und entdoppelt gegen den Text", () => {
    expect(
      linkedSlugsOf(
        {
          slug: "sareth",
          sourceMd: "Kennt [[Tuvok]] gut.",
          refs: ["tuvok", "t-mok", "gibt-es-nicht"],
        },
        lookup(),
      ).sort(),
    ).toEqual(["t-mok", "tuvok"]);
  });

  it("verträgt fehlenden Text", () => {
    expect(linkedSlugsOf({ slug: "kira", sourceMd: null }, lookup())).toEqual(
      [],
    );
  });
});

describe("collectLinkEdges", () => {
  it("zählt je Paar und Richtung einen Verweis", () => {
    const pairs = collectLinkEdges(
      [
        { slug: "tuvok", sourceMd: "Über [[Wirtin Sareth]]." },
        { slug: "sareth", sourceMd: "Über [[Tuvok]]." },
      ],
      lookup(),
    );
    // Gegenseitig verlinkt: zwei Berührungspunkte auf EINER Kante.
    expect([...pairs.entries()]).toEqual([["sareth|tuvok", 2]]);
  });

  it("legt für eine einseitige Verlinkung eine Kante mit dem Gewicht 1 an", () => {
    const pairs = collectLinkEdges(
      [{ slug: "tuvok", sourceMd: "Über [[Wirtin Sareth]]." }],
      lookup(),
    );
    expect(pairs.get("sareth|tuvok")).toBe(1);
  });

  // Ein Text, dessen Figur selbst nicht sichtbar ist (nicht im Nachschlage-
  // werk), darf keine Kante erzeugen.
  it("überspringt Quellen, die selbst kein Knoten sind", () => {
    const pairs = collectLinkEdges(
      [{ slug: "unsichtbar", sourceMd: "[[Tuvok]]" }],
      lookup(),
    );
    expect(pairs.size).toBe(0);
  });
});

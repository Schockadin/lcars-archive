import { describe, it, expect } from "vitest";
import {
  needsAutolinkSync,
  newPhrasesOf,
  renamedFrom,
  retargetWikilinks,
  type AutolinkRenameInput,
} from "@/lib/autolinkRename";

function input(patch: Partial<AutolinkRenameInput> = {}): AutolinkRenameInput {
  return {
    type: "archive",
    slug: "sareth",
    previousName: "Sareth",
    previousAliases: [],
    name: "Sareth",
    aliases: [],
    ...patch,
  };
}

describe("retargetWikilinks", () => {
  it("schreibt einen Link auf den alten Namen um und behält den Wortlaut", () => {
    const result = retargetWikilinks(
      "Wir trafen [[Sareth]] im Hafen.",
      "Sareth",
      "Wirtin Sareth",
    );

    expect(result.sourceMd).toBe("Wir trafen [[Wirtin Sareth|Sareth]] im Hafen.");
    expect(result.retargeted).toBe(1);
  });

  it("behält einen bereits gesetzten Anzeigetext", () => {
    const result = retargetWikilinks(
      "Und [[Sareth|sie]] schwieg.",
      "Sareth",
      "Wirtin Sareth",
    );

    expect(result.sourceMd).toBe("Und [[Wirtin Sareth|sie]] schwieg.");
  });

  it("behält einen Abschnitts-Anker", () => {
    const result = retargetWikilinks(
      "[[Sareth#Herkunft]]",
      "Sareth",
      "Wirtin Sareth",
    );

    expect(result.sourceMd).toBe("[[Wirtin Sareth#Herkunft|Sareth]]");
  });

  it("lässt Links auf andere Ziele und bloße Namensnennungen unberührt", () => {
    const md = "Sareth stand neben [[Tuvok]].";
    expect(retargetWikilinks(md, "Sareth", "Wirtin Sareth")).toEqual({
      sourceMd: md,
      retargeted: 0,
    });
  });

  it("tut nichts, wenn sich der Name nur in der Schreibweise unterscheidet", () => {
    const md = "[[Sareth]]";
    expect(retargetWikilinks(md, "Sareth", "sareth")).toEqual({
      sourceMd: md,
      retargeted: 0,
    });
  });
});

describe("newPhrasesOf", () => {
  it("liefert nur Schreibweisen, die es vorher nicht gab", () => {
    expect(
      newPhrasesOf(
        input({
          previousName: "Sareth",
          previousAliases: ["Die Wirtin"],
          name: "Wirtin Sareth",
          aliases: ["Die Wirtin", "Sareth vom Hafen"],
        }),
      ),
    ).toEqual(["Wirtin Sareth", "Sareth vom Hafen"]);
  });

  it("zählt eine andere Groß-/Kleinschreibung nicht als neue Schreibweise", () => {
    expect(
      newPhrasesOf(input({ previousName: "Sareth", name: "SARETH" })),
    ).toEqual([]);
  });

  it("wirft Leeres und Dopplungen weg", () => {
    expect(
      newPhrasesOf(
        input({ name: "Sareth", aliases: ["  ", "Wirtin", "wirtin"] }),
      ),
    ).toEqual(["Wirtin"]);
  });
});

describe("renamedFrom / needsAutolinkSync", () => {
  it("erkennt eine Umbenennung", () => {
    const changed = input({ previousName: "Sareth", name: "Wirtin Sareth" });
    expect(renamedFrom(changed)).toBe("Sareth");
    expect(needsAutolinkSync(changed)).toBe(true);
  });

  it("erkennt einen neuen Alias ohne Umbenennung", () => {
    const changed = input({ aliases: ["Die Wirtin"] });
    expect(renamedFrom(changed)).toBeNull();
    expect(needsAutolinkSync(changed)).toBe(true);
  });

  it("sagt nein, wenn alles beim Alten bleibt", () => {
    expect(
      needsAutolinkSync(
        input({ previousAliases: ["Die Wirtin"], aliases: ["Die Wirtin"] }),
      ),
    ).toBe(false);
  });
});

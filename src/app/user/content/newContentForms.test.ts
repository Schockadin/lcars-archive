import { describe, expect, it } from "vitest";
import {
  NEW_CONTENT_FORMS,
  NEW_CONTENT_LABELS,
  NEW_CONTENT_TITLES,
  visibleNewContentForms,
} from "./newContentForms";
import type { NewContentData } from "./newContentData";

// Ein Konto, für das alles möglich ist: eigener veröffentlichter Charakter
// (Logbuch, Gespräch) und Spielleitung (Mission).
function alles(over: Partial<NewContentData> = {}): NewContentData {
  return {
    userId: 1,
    missionLog: {
      ownCharacters: [],
      missions: [],
      defaultSessionNr: 1,
      defaultLogDate: null,
    },
    dialogue: {
      ownCharacters: [],
      partnerCharacters: [],
      npcs: [],
      canPlayNpcs: false,
      gms: [],
      locations: [],
      defaultLogDate: null,
    },
    mission: { defaultStartedAt: null, characters: [] },
    ...over,
  };
}

describe("newContentForms", () => {
  it("beschriftet und betitelt jedes Formular", () => {
    for (const form of NEW_CONTENT_FORMS) {
      expect(NEW_CONTENT_LABELS[form].length).toBeGreaterThan(0);
      expect(NEW_CONTENT_TITLES[form].length).toBeGreaterThan(0);
    }
  });
});

describe("visibleNewContentForms", () => {
  it("zeigt ohne Einschränkung alles, was möglich ist", () => {
    expect(visibleNewContentForms(alles())).toEqual([
      "missionLog",
      "dialogue",
      "archiveEntry",
      "npc",
      "mission",
    ]);
  });

  // Ohne eigenen veröffentlichten Charakter kein Logbuch und kein Gespräch,
  // ohne Spielleitung keine Mission — die Seite reicht dafür gar keine Daten
  // durch (null).
  it("lässt weg, wofür dieses Konto keine Daten hat", () => {
    expect(
      visibleNewContentForms(
        alles({ missionLog: null, dialogue: null, mission: null }),
      ),
    ).toEqual(["archiveEntry", "npc"]);
  });

  it("achtet die Auswahl der Seite", () => {
    expect(visibleNewContentForms(alles(), ["npc", "dialogue"])).toEqual([
      "dialogue",
      "npc",
    ]);
  });

  // Beide Bedingungen zählen: Eine Auswahl erlaubt nur, sie schafft keine
  // Voraussetzung. Sonst stünde auf der Startseite ein Logbuch-Knopf für
  // jemanden ohne Charakter — und dahinter ein Formular ohne Autor.
  it("erlaubt nur, was die Auswahl UND die Daten hergeben", () => {
    expect(
      visibleNewContentForms(alles({ missionLog: null }), [
        "missionLog",
        "npc",
      ]),
    ).toEqual(["npc"]);
  });

  it("gibt bei leerer Auswahl nichts zurück", () => {
    expect(visibleNewContentForms(alles(), [])).toEqual([]);
  });

  // Die Reihenfolge ist die der Knopfleiste, nicht die der Auswahl — sonst
  // sprängen die Knöpfe je nach Profil-Einstellung umher.
  it("hält die Reihenfolge der Leiste", () => {
    expect(visibleNewContentForms(alles(), ["mission", "missionLog"])).toEqual([
      "missionLog",
      "mission",
    ]);
  });
});

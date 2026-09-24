import { describe, expect, it } from "vitest";
import {
  buildDashboardPrefs,
  DASHBOARD_SECTIONS,
  dashboardCharacterVisible,
  dashboardSectionEnabled,
  EMPTY_DASHBOARD_PREFS,
  isDashboardSectionId,
  sanitizeDashboardPrefs,
  type DashboardSectionId,
} from "./dashboardSections";

// Die Vorgaben sind eine Absprache, keine Geschmacksfrage: Wer sie ändert,
// ändert für JEDES Bestandskonto, was nach dem nächsten Login auf der
// Startseite steht — gespeichert wird nur, was jemand selbst angefasst hat
// (siehe den Kopf von dashboardSections.ts). Deshalb stehen sie hier
// ausgeschrieben.
const VORGABEN: Record<DashboardSectionId, boolean> = {
  "erste-schritte": false,
  spielabende: true,
  todos: false,
  gespraeche: true,
  "neues-log": true,
  "neues-gespraech": true,
  "neues-event": true,
  "neuer-eintrag": true,
  "neuer-npc": true,
  import: true,
  entwuerfe: true,
  charaktere: true,
  versionen: false,
  news: true,
  lesezeichen: false,
};

describe("DASHBOARD_SECTIONS", () => {
  it("hält die vereinbarten Vorgaben", () => {
    const tatsaechlich = Object.fromEntries(
      DASHBOARD_SECTIONS.map((s) => [s.id, s.default]),
    );
    expect(tatsaechlich).toEqual(VORGABEN);
  });

  it("gibt jeder Sektion eine eindeutige id, Beschriftung und Erklärung", () => {
    const ids = DASHBOARD_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of DASHBOARD_SECTIONS) {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.hint.length).toBeGreaterThan(0);
    }
  });

  it("erkennt nur bekannte Schlüssel", () => {
    expect(isDashboardSectionId("news")).toBe(true);
    expect(isDashboardSectionId("newsletter")).toBe(false);
  });
});

describe("dashboardSectionEnabled", () => {
  it("nimmt ohne gespeicherte Wahl die Vorgabe", () => {
    for (const section of DASHBOARD_SECTIONS) {
      expect(dashboardSectionEnabled(EMPTY_DASHBOARD_PREFS, section.id)).toBe(
        section.default,
      );
    }
  });

  it("lässt die gespeicherte Wahl die Vorgabe schlagen — in beide Richtungen", () => {
    const prefs = {
      sections: { news: false, versionen: true } as const,
      hiddenCharacters: [],
    };
    // news ist per Vorgabe an, versionen per Vorgabe aus.
    expect(dashboardSectionEnabled(prefs, "news")).toBe(false);
    expect(dashboardSectionEnabled(prefs, "versionen")).toBe(true);
  });
});

describe("dashboardCharacterVisible", () => {
  it("zeigt jeden Charakter, den niemand abgewählt hat", () => {
    expect(dashboardCharacterVisible(EMPTY_DASHBOARD_PREFS, 7)).toBe(true);
  });

  it("blendet genau die abgewählten aus", () => {
    const prefs = { sections: {}, hiddenCharacters: [7, 9] };
    expect(dashboardCharacterVisible(prefs, 7)).toBe(false);
    expect(dashboardCharacterVisible(prefs, 8)).toBe(true);
  });
});

describe("sanitizeDashboardPrefs", () => {
  it("macht aus Unsinn leere Vorlieben", () => {
    for (const unsinn of [null, undefined, 42, "news", [], { sections: 5 }]) {
      expect(sanitizeDashboardPrefs(unsinn)).toEqual(EMPTY_DASHBOARD_PREFS);
    }
  });

  it("wirft unbekannte Sektionen und falsche Typen weg", () => {
    const prefs = sanitizeDashboardPrefs({
      sections: { news: false, newsletter: true, versionen: "ja" },
      hiddenCharacters: [3, "4", null, -1, 3],
    });

    expect(prefs.sections).toEqual({ news: false });
    // "4" ist keine Zahl, null und -1 keine gültige id, die 3 steht nur einmal.
    expect(prefs.hiddenCharacters).toEqual([3]);
  });

  it("übersteht den Weg durch JSONB", () => {
    const gespeichert = buildDashboardPrefs({
      enabledSections: ["versionen", "todos"],
      knownSections: DASHBOARD_SECTIONS.map((s) => s.id),
      hiddenCharacters: [12],
    });

    // Genau diesen Weg nimmt die Spalte users.dashboard_prefs.
    const zurueck = sanitizeDashboardPrefs(
      JSON.parse(JSON.stringify(gespeichert)),
    );

    expect(zurueck).toEqual(gespeichert);
    expect(dashboardSectionEnabled(zurueck, "versionen")).toBe(true);
    expect(dashboardSectionEnabled(zurueck, "news")).toBe(false);
    expect(dashboardCharacterVisible(zurueck, 12)).toBe(false);
  });
});

describe("buildDashboardPrefs", () => {
  it("speichert NUR, was von der Vorgabe abweicht", () => {
    // Angehakt: genau die, die ohnehin per Vorgabe an sind.
    const prefs = buildDashboardPrefs({
      enabledSections: DASHBOARD_SECTIONS.filter((s) => s.default).map(
        (s) => s.id,
      ),
      knownSections: DASHBOARD_SECTIONS.map((s) => s.id),
      hiddenCharacters: [],
    });

    expect(prefs.sections).toEqual({});
  });

  it("hält beide Abweichungen fest", () => {
    const prefs = buildDashboardPrefs({
      // news (Vorgabe an) fehlt, versionen (Vorgabe aus) ist dabei.
      enabledSections: ["versionen"],
      knownSections: ["news", "versionen"],
      hiddenCharacters: [],
    });

    expect(prefs.sections).toEqual({ news: false, versionen: true });
  });

  it("lässt Sektionen unangetastet, die das Formular nicht kannte", () => {
    const prefs = buildDashboardPrefs({
      enabledSections: [],
      knownSections: ["news"],
      hiddenCharacters: [],
    });

    // Nur news war überhaupt zur Wahl gestellt — todos behält seine Vorgabe.
    expect(prefs.sections).toEqual({ news: false });
    expect(dashboardSectionEnabled(prefs, "todos")).toBe(false);
    expect(dashboardSectionEnabled(prefs, "spielabende")).toBe(true);
  });

  it("räumt die Charakter-Liste auf", () => {
    const prefs = buildDashboardPrefs({
      enabledSections: [],
      knownSections: [],
      hiddenCharacters: [4, 4, 0, -2, 5],
    });

    expect(prefs.hiddenCharacters).toEqual([4, 5]);
  });

  it("ignoriert erfundene Sektions-Schlüssel", () => {
    const prefs = buildDashboardPrefs({
      enabledSections: ["passwort-klartext"],
      knownSections: ["passwort-klartext"],
      hiddenCharacters: [],
    });

    expect(prefs.sections).toEqual({});
  });
});

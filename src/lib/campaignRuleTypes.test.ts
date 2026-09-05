import { describe, it, expect } from "vitest";
import {
  RULE_BODY_MAX,
  RULE_NAME_MAX,
  byRuleOrder,
  validateCampaignRuleInput,
  type CampaignRule,
} from "./campaignRuleTypes";

function rule(overrides: Partial<CampaignRule> = {}): CampaignRule {
  return { id: 1, name: "Regel", body: "Text", sortOrder: 0, ...overrides };
}

describe("validateCampaignRuleInput", () => {
  const ok = { name: "Kritische Erfolge", body: "Eine 1 zählt doppelt.", sortOrder: "2" };

  it("nimmt einen gültigen Eintrag an und trimmt Name und Text", () => {
    expect(
      validateCampaignRuleInput({ ...ok, name: "  Kritische Erfolge ", body: " Eine 1 zählt doppelt. " }),
    ).toEqual({
      ok: true,
      value: { name: "Kritische Erfolge", body: "Eine 1 zählt doppelt.", sortOrder: 2 },
    });
  });

  it("verlangt einen Namen", () => {
    expect(validateCampaignRuleInput({ ...ok, name: "  " })).toEqual({
      ok: false,
      error: "Bitte einen Namen angeben.",
    });
  });

  it("verlangt einen Regeltext", () => {
    expect(validateCampaignRuleInput({ ...ok, body: "\n " })).toEqual({
      ok: false,
      error: "Bitte einen Regeltext angeben.",
    });
  });

  it("begrenzt Name und Text", () => {
    expect(validateCampaignRuleInput({ ...ok, name: "x".repeat(RULE_NAME_MAX + 1) }).ok).toBe(false);
    expect(validateCampaignRuleInput({ ...ok, body: "x".repeat(RULE_BODY_MAX + 1) }).ok).toBe(false);
  });

  // Leeres Feld ist der Normalfall („ist mir egal") und wird zu 0; eine
  // kaputte Zahl ist ein Eingabefehler und soll auffallen.
  it("nimmt eine leere Reihenfolge als 0", () => {
    const result = validateCampaignRuleInput({ ...ok, sortOrder: "  " });
    expect(result.ok && result.value.sortOrder).toBe(0);
  });

  it("erlaubt negative Werte (nach oben sortieren)", () => {
    const result = validateCampaignRuleInput({ ...ok, sortOrder: "-3" });
    expect(result.ok && result.value.sortOrder).toBe(-3);
  });

  it("weist eine unganze oder unlesbare Reihenfolge ab", () => {
    expect(validateCampaignRuleInput({ ...ok, sortOrder: "1,5" }).ok).toBe(false);
    expect(validateCampaignRuleInput({ ...ok, sortOrder: "oben" }).ok).toBe(false);
  });
});

describe("byRuleOrder", () => {
  it("sortiert nach Reihenfolge, bei Gleichstand alphabetisch", () => {
    const list = [
      rule({ id: 1, name: "Zonen", sortOrder: 0 }),
      rule({ id: 2, name: "Ausdauer", sortOrder: 0 }),
      rule({ id: 3, name: "Vorrang", sortOrder: -1 }),
      rule({ id: 4, name: "Nachspiel", sortOrder: 5 }),
    ];
    expect([...list].sort(byRuleOrder).map((r) => r.name)).toEqual([
      "Vorrang",
      "Ausdauer",
      "Zonen",
      "Nachspiel",
    ]);
  });

  it("sortiert Umlaute sprachbewusst ein", () => {
    const list = [rule({ id: 1, name: "Zug" }), rule({ id: 2, name: "Übergabe" })];
    expect([...list].sort(byRuleOrder).map((r) => r.name)).toEqual(["Übergabe", "Zug"]);
  });
});

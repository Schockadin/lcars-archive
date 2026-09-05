import { describe, expect, it } from "vitest";
import {
  buildOnboardingSteps,
  onboardingProgress,
  type OnboardingFacts,
} from "./onboardingSteps";
import { TUTORIAL_SECTIONS } from "./tutorialSections";

const NOTHING: OnboardingFacts = {
  hasPassword: false,
  characterCount: 0,
  lockedCharacterCount: 0,
  logCount: 0,
  dialogueCount: 0,
};

const ALL: OnboardingFacts = {
  hasPassword: true,
  characterCount: 1,
  lockedCharacterCount: 1,
  logCount: 2,
  dialogueCount: 1,
};

describe("buildOnboardingSteps", () => {
  it("hat am Anfang keinen Schritt erledigt", () => {
    expect(buildOnboardingSteps(NOTHING).every((s) => !s.done)).toBe(true);
  });

  it("hakt alle Schritte ab, wenn alles vorhanden ist", () => {
    const steps = buildOnboardingSteps(ALL);
    expect(steps.every((s) => s.done)).toBe(true);
    expect(onboardingProgress(steps)).toEqual({
      done: 5,
      total: 5,
      complete: true,
    });
  });

  it("zählt einen Charakter, dessen Erschaffung noch läuft, nur beim Anlegen", () => {
    const steps = buildOnboardingSteps({ ...NOTHING, characterCount: 1 });
    expect(steps.find((s) => s.id === "charakter")?.done).toBe(true);
    expect(steps.find((s) => s.id === "erschaffung")?.done).toBe(false);
  });

  it("führt ohne Charakter auch beim Erschaffungs-Schritt in den Assistenten", () => {
    const step = buildOnboardingSteps(NOTHING).find(
      (s) => s.id === "erschaffung",
    );
    expect(step?.href).toBe("/user/characters/new");
  });

  it("führt mit Charakter zur eigenen Charakterübersicht", () => {
    const step = buildOnboardingSteps({
      ...NOTHING,
      characterCount: 1,
    }).find((s) => s.id === "erschaffung");
    expect(step?.href).toBe("/user/characters");
  });

  it("zählt teilweisen Fortschritt richtig", () => {
    const steps = buildOnboardingSteps({
      ...NOTHING,
      hasPassword: true,
      characterCount: 2,
    });
    expect(onboardingProgress(steps)).toEqual({
      done: 2,
      total: 5,
      complete: false,
    });
  });

  it("gibt jedem Schritt eine eindeutige id", () => {
    const ids = buildOnboardingSteps(NOTHING).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Anleitung", () => {
  it("kennt den Abschnitt „Erste Schritte“ (Ziel des Changelog-Links)", () => {
    expect(TUTORIAL_SECTIONS.some((s) => s.id === "erste-schritte")).toBe(true);
  });
});

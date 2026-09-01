import { describe, it, expect } from "vitest";
import {
  isIsoDate,
  validateGameSessionInput,
  SESSION_TITLE_MAX,
  SESSION_AP_MAX,
} from "@/lib/gameSessionFormat";

const valid = {
  sessionDate: "2026-04-20",
  title: "  Der Nebel von Cygnus IV  ",
  sessionAp: "1",
  bonusAp: "0",
  notes: "  Erstkontakt  ",
  characterIds: ["3", "7"],
};

describe("isIsoDate", () => {
  it("nimmt echte Kalendertage an", () => {
    expect(isIsoDate("2026-04-20")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
  });

  it("lehnt falsche Form und nicht existierende Tage ab", () => {
    expect(isIsoDate("20.04.2026")).toBe(false);
    expect(isIsoDate("2026-4-20")).toBe(false);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("validateGameSessionInput", () => {
  it("trimmt und übernimmt gültige Eingaben", () => {
    const result = validateGameSessionInput(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        sessionDate: "2026-04-20",
        title: "Der Nebel von Cygnus IV",
        sessionAp: 1,
        bonusAp: 0,
        notes: "Erstkontakt",
        characterIds: [3, 7],
      },
    });
  });

  it("entfernt doppelte Charaktere, damit niemand zweimal gutgeschrieben bekommt", () => {
    const result = validateGameSessionInput({
      ...valid,
      characterIds: ["3", "3", "7"],
    });
    expect(result.ok && result.value.characterIds).toEqual([3, 7]);
  });

  it("lehnt ungültige Daten ab", () => {
    expect(validateGameSessionInput({ ...valid, sessionDate: "" }).ok).toBe(false);
    expect(validateGameSessionInput({ ...valid, sessionDate: "2026-02-31" }).ok).toBe(false);
  });

  it("lehnt unbrauchbare AP-Beträge ab", () => {
    expect(validateGameSessionInput({ ...valid, sessionAp: "-1" }).ok).toBe(false);
    expect(validateGameSessionInput({ ...valid, sessionAp: "1,5" }).ok).toBe(false);
    expect(validateGameSessionInput({ ...valid, bonusAp: "abc" }).ok).toBe(false);
    expect(
      validateGameSessionInput({ ...valid, bonusAp: String(SESSION_AP_MAX + 1) }).ok,
    ).toBe(false);
  });

  it("lehnt einen zu langen Titel ab", () => {
    const result = validateGameSessionInput({
      ...valid,
      title: "x".repeat(SESSION_TITLE_MAX + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("erlaubt eine Session ohne Teilnehmende nur ohne AP", () => {
    expect(
      validateGameSessionInput({
        ...valid,
        characterIds: [],
        sessionAp: "0",
        bonusAp: "0",
      }).ok,
    ).toBe(true);
    expect(
      validateGameSessionInput({ ...valid, characterIds: [], sessionAp: "1" }).ok,
    ).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  countRsvps,
  formatSessionMoment,
  ownResponse,
  parsePlannedSession,
} from "./plannedSessionFormat";
import type { PlannedSession } from "./plannedSessionTypes";

function form(overrides: Partial<Record<string, string>> = {}) {
  return {
    date: "2026-06-12",
    time: "19:30",
    title: "Fortsetzung",
    location: "Bei Anna",
    notes: "",
    ...overrides,
  };
}

describe("parsePlannedSession", () => {
  it("setzt Datum und Uhrzeit zu einem Zeitpunkt zusammen", () => {
    const result = parsePlannedSession(form());
    expect(result).toMatchObject({
      ok: true,
      scheduledAt: "2026-06-12 19:30",
      title: "Fortsetzung",
      location: "Bei Anna",
    });
  });

  it("besteht auf Datum und Uhrzeit", () => {
    expect(parsePlannedSession(form({ date: "" }))).toMatchObject({
      ok: false,
    });
    expect(parsePlannedSession(form({ time: "" }))).toMatchObject({
      ok: false,
    });
  });

  it("weist einen Titel ab, der zu lang ist", () => {
    expect(parsePlannedSession(form({ title: "x".repeat(201) }))).toMatchObject(
      { ok: false },
    );
  });
});

describe("formatSessionMoment", () => {
  it("versteht die Schreibweise der Datenbank", () => {
    // timestamptz::text kommt als „2026-06-12 19:30:00+00" — mit Leerzeichen
    // und zweistelligem Offset. Ohne Umschrift stand hier der rohe Wert.
    const text = formatSessionMoment("2026-06-12 19:30:00.123456+00");
    expect(text).toContain("Juni");
    expect(text).not.toContain("+00");
  });

  it("schreibt Wochentag, Datum und Uhrzeit aus", () => {
    const text = formatSessionMoment("2026-06-12 19:30");
    expect(text).toContain("Freitag");
    expect(text).toContain("Juni");
    expect(text).toContain("19:30");
  });
});

function session(rsvps: PlannedSession["rsvps"]): PlannedSession {
  return {
    id: 1,
    scheduledAt: "2026-06-12 19:30",
    title: "",
    location: "",
    notes: "",
    createdByName: null,
    rsvps,
  };
}

describe("countRsvps / ownResponse", () => {
  it("zählt Zu- und Absagen getrennt", () => {
    const s = session([
      { userId: 1, userName: "A", response: "yes", note: "" },
      { userId: 2, userName: "B", response: "no", note: "" },
      { userId: 3, userName: "C", response: "yes", note: "" },
    ]);
    expect(countRsvps(s)).toEqual({ yes: 2, no: 1 });
  });

  it("kennt die eigene Antwort — und dass es keine gibt", () => {
    const s = session([{ userId: 1, userName: "A", response: "yes", note: "" }]);
    expect(ownResponse(s, 1)).toBe("yes");
    // Wer nicht geantwortet hat, steht auf keiner Liste.
    expect(ownResponse(s, 2)).toBeNull();
    expect(ownResponse(s, null)).toBeNull();
  });
});

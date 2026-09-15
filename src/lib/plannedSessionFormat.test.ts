import { describe, it, expect } from "vitest";
import {
  countRsvps,
  formatSessionMoment,
  isUpcoming,
  ownResponse,
  parsePlannedSession,
  toDateTimeLocal,
} from "./plannedSessionFormat";
import type { PlannedSession } from "./plannedSessionTypes";

function form(overrides: Record<string, unknown> = {}) {
  return {
    scheduledAt: "2026-06-12T19:30",
    title: "Fortsetzung",
    location: "Bei Anna",
    notes: "",
    characterIds: [] as string[],
    ...overrides,
  };
}

describe("parsePlannedSession", () => {
  it("übernimmt den Zeitpunkt aus dem datetime-local-Feld", () => {
    const result = parsePlannedSession(form());
    expect(result).toMatchObject({
      ok: true,
      scheduledAt: "2026-06-12 19:30",
      title: "Fortsetzung",
      location: "Bei Anna",
    });
  });

  it("besteht auf Datum und Uhrzeit", () => {
    expect(parsePlannedSession(form({ scheduledAt: "" }))).toMatchObject({
      ok: false,
    });
    // Nur ein Datum genügt nicht — ohne Uhrzeit lässt sich nicht zusagen.
    expect(
      parsePlannedSession(form({ scheduledAt: "2026-06-12" })),
    ).toMatchObject({ ok: false });
  });

  it("nimmt auch die Sekunden-Schreibweise mancher Browser", () => {
    expect(
      parsePlannedSession(form({ scheduledAt: "2026-06-12T19:30:00" })),
    ).toMatchObject({ ok: true, scheduledAt: "2026-06-12 19:30" });
  });

  it("liest die Teilnehmenden als Zahlen und wirft Doppelte weg", () => {
    expect(
      parsePlannedSession(form({ characterIds: ["3", "7", "3"] })),
    ).toMatchObject({ ok: true, characterIds: [3, 7] });
  });

  it("weist eine unsinnige Teilnehmer-Auswahl ab", () => {
    expect(
      parsePlannedSession(form({ characterIds: ["abc"] })),
    ).toMatchObject({ ok: false });
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
    notesHtml: "",
    createdByName: null,
    characterIds: [],
    gameSessionId: null,
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

describe("toDateTimeLocal", () => {
  it("macht aus dem Datenbankwert einen Wert für das Eingabefeld", () => {
    // „2026-06-12 19:30:00+00" versteht <input type="datetime-local"> nicht;
    // ohne die Umschrift bliebe das Feld beim Ändern leer.
    expect(toDateTimeLocal("2026-06-12 19:30:00+00")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it("gibt bei Unsinn nichts zurück statt „Invalid Date“", () => {
    expect(toDateTimeLocal("kein Datum")).toBe("");
  });
});

// Entscheidet, ob ein neu angekündigter Termin die Spielenden seiner Figuren
// per Mail/Push erreicht (siehe createPlannedSessionAction) — und spiegelt
// die Regel, nach der das Dashboard nur noch Zukünftiges zeigt.
describe("isUpcoming", () => {
  const now = new Date("2026-06-12T19:30:00Z");

  it("nimmt an, was noch bevorsteht", () => {
    expect(isUpcoming("2026-06-12 19:31:00+00", now)).toBe(true);
    expect(isUpcoming("2026-07-01 20:00:00+00", now)).toBe(true);
  });

  it("lehnt ab, was schon läuft oder vorbei ist", () => {
    // Genau jetzt zählt nicht mehr als „steht bevor".
    expect(isUpcoming("2026-06-12 19:30:00+00", now)).toBe(false);
    expect(isUpcoming("2026-06-12 19:29:00+00", now)).toBe(false);
    expect(isUpcoming("2026-01-01 20:00:00+00", now)).toBe(false);
  });

  // Der Wert kommt mal aus dem Formular („…T19:30" bzw. „… 19:30"), mal aus
  // Postgres („… 19:30:00+00") — beide Schreibweisen müssen durchgehen.
  it("versteht Formular- wie Datenbankschreibweise", () => {
    expect(isUpcoming("2026-07-01 20:00", now)).toBe(true);
    expect(isUpcoming("2026-07-01T20:00", now)).toBe(true);
  });

  it("schweigt lieber, als einen unlesbaren Zeitpunkt anzukündigen", () => {
    expect(isUpcoming("kein Datum", now)).toBe(false);
  });
});

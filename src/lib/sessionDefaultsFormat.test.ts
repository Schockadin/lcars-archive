import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_DEFAULTS,
  nextSessionDateTime,
  type SessionDefaults,
} from "./sessionDefaultsFormat";

describe("Session-Voreinstellungen", () => {
  it("setzt die Kampagnen-Standardwerte", () => {
    expect(DEFAULT_SESSION_DEFAULTS).toEqual({
      weekday: 0,
      weekParity: "odd",
      time: "16:00",
      location: "David",
    });
  });

  it("nimmt den heutigen Termin, wenn die Vorgabe-Uhrzeit noch bevorsteht", () => {
    const defaults: SessionDefaults = {
      weekday: 0,
      weekParity: "odd",
      time: "16:00",
      location: "David",
    };

    expect(nextSessionDateTime(defaults, new Date(2025, 0, 5, 15, 59))).toBe(
      "2025-01-05T16:00",
    );
  });

  it("überspringt einen Termin, dessen Uhrzeit heute bereits vorbei ist", () => {
    expect(
      nextSessionDateTime(
        { ...DEFAULT_SESSION_DEFAULTS },
        new Date(2025, 0, 5, 16, 1),
      ),
    ).toBe("2025-01-19T16:00");
  });

  it("wählt den nächsten Sonntag einer geraden ISO-Kalenderwoche", () => {
    expect(
      nextSessionDateTime(
        { ...DEFAULT_SESSION_DEFAULTS, weekParity: "even" },
        new Date(2025, 0, 7, 18, 0),
      ),
    ).toBe("2025-01-12T16:00");
  });

  it("berechnet die Kalenderwochen-Parität über den Jahreswechsel nach ISO 8601", () => {
    expect(
      nextSessionDateTime(
        { ...DEFAULT_SESSION_DEFAULTS },
        new Date(2025, 11, 28, 18, 0),
      ),
    ).toBe("2026-01-04T16:00");
  });
});


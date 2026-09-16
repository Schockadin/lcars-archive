import { describe, it, expect } from "vitest";
import {
  formatISODate,
  formatDateTime,
  formatDateTimeShort,
  toIsoDateTime,
} from "./formateISODate";

describe("formatISODate", () => {
  it("returns an em dash for null", () => {
    expect(formatISODate(null)).toBe("—");
  });

  it("formats a date-only ISO string in German long form", () => {
    expect(formatISODate("2024-06-15")).toBe("15. Juni 2024");
  });
});

describe("formatDateTime", () => {
  it("returns an em dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("renders in Europe/Berlin time, not the runtime's local/UTC time", () => {
    // 2024-06-15T10:00:00Z ist im Sommer (CEST, UTC+2) 12:00 Uhr in Berlin —
    // eine ungesetzte timeZone-Option würde hier auf der (in CI/Netlify oft
    // UTC laufenden) Node-Umgebung fälschlich "10:00" anzeigen.
    const result = formatDateTime("2024-06-15T10:00:00.000Z");
    expect(result).toContain("12:00");
    expect(result).toContain("15");
    expect(result).toContain("Juni");
    expect(result).toContain("2024");
  });

  it("applies the winter (CET, UTC+1) offset correctly", () => {
    // 2024-01-15T10:00:00Z -> 11:00 Uhr in Berlin (kein Sommerzeit-Offset).
    const result = formatDateTime("2024-01-15T10:00:00.000Z");
    expect(result).toContain("11:00");
  });
});

describe("Postgres-Schreibweise (TIMESTAMPTZ::text)", () => {
  // „2026-09-16 10:00:00+00" ist das, was Postgres per ::text liefert (siehe
  // z.B. getDialogueMessages in src/lib/dialoguesCore.ts): Leerzeichen statt
  // „T", Zonen-Offset ohne Minuten. Ohne Umschrift parst das nur Node,
  // strengere Browser-Engines liefern NaN — Server-Render und Hydration
  // würden auseinanderlaufen.
  it("formatDateTime versteht die Postgres-Schreibweise", () => {
    const result = formatDateTime("2026-09-16 10:00:00+00");
    expect(result).toContain("12:00");
    expect(result).toContain("September");
    expect(result).toContain("2026");
  });

  it("toIsoDateTime normalisiert sie zu echtem ISO 8601", () => {
    expect(toIsoDateTime("2026-09-16 10:00:00+00")).toBe(
      "2026-09-16T10:00:00.000Z",
    );
  });

  it("fasst ein reines Datum nicht an", () => {
    // Der Tag am Ende („…-16") sieht aus wie ein Zonen-Offset — ein
    // ungenaueres Muster machte daraus „2026-09-16:00" und damit ein
    // Invalid Date.
    expect(toIsoDateTime("2026-09-16")).toBe("2026-09-16T00:00:00.000Z");
    expect(formatDateTime("2026-09-16")).toContain("September");
  });

  it("versteht einen anderen Offset und Sekundenbruchteile", () => {
    expect(toIsoDateTime("2026-09-16 10:00:00+02")).toBe(
      "2026-09-16T08:00:00.000Z",
    );
    expect(toIsoDateTime("2026-09-16 10:00:00.123456+00")).toBe(
      "2026-09-16T10:00:00.123Z",
    );
  });

  it("liefert für unparsbare Werte kein NaN", () => {
    expect(formatDateTime("Kein Datum")).toBe("—");
    expect(formatDateTimeShort("Kein Datum")).toBe("—");
    expect(toIsoDateTime("Kein Datum")).toBe("");
  });
});

describe("formatDateTimeShort", () => {
  it("returns an em dash for null", () => {
    expect(formatDateTimeShort(null)).toBe("—");
  });

  it("schreibt Datum und Uhrzeit kompakt, in Berliner Zeit", () => {
    expect(formatDateTimeShort("2026-09-16T10:00:00.000Z")).toBe(
      "16.09.2026, 12:00",
    );
  });

  it("wendet den Winter-Offset (CET, UTC+1) an", () => {
    expect(formatDateTimeShort("2026-01-16T10:00:00.000Z")).toBe(
      "16.01.2026, 11:00",
    );
  });
});

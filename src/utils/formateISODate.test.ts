import { describe, it, expect } from "vitest";
import { formatISODate, formatDateTime } from "./formateISODate";

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

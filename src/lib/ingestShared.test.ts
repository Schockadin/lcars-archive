import { describe, it, expect } from "vitest";
import { validateSlug, parseDate, toStringArray, toNumberArray } from "./ingestShared";

describe("validateSlug", () => {
  it("returns a valid slug unchanged", () => {
    expect(validateSlug("deep-space-9", "f.md")).toBe("deep-space-9");
  });

  it("throws for a missing slug", () => {
    expect(() => validateSlug(undefined, "f.md")).toThrow(/Kein slug/);
    expect(() => validateSlug("", "f.md")).toThrow(/Kein slug/);
  });

  it("throws for an invalid slug (uppercase/special chars)", () => {
    expect(() => validateSlug("Deep Space 9", "f.md")).toThrow(/Ungültiger slug/);
  });
});

describe("parseDate", () => {
  it("returns null for falsy input", () => {
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("formats a Date instance (as gray-matter auto-parses YYYY-MM-DD) to YYYY-MM-DD in UTC", () => {
    expect(parseDate(new Date(Date.UTC(2394, 3, 1)))).toBe("2394-04-01");
  });

  it("accepts an already-formatted YYYY-MM-DD string", () => {
    expect(parseDate("2394-04-01")).toBe("2394-04-01");
  });

  it("throws for an invalid date format", () => {
    expect(() => parseDate("01.04.2394")).toThrow(/Ungültiges Datumsformat/);
  });
});

describe("toStringArray", () => {
  it("returns an empty array for falsy input", () => {
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray(null)).toEqual([]);
  });

  it("wraps a single string in an array", () => {
    expect(toStringArray("solo")).toEqual(["solo"]);
  });

  it("maps array elements to strings", () => {
    expect(toStringArray(["a", "b"])).toEqual(["a", "b"]);
  });

  it("returns an empty array for other types", () => {
    expect(toStringArray(42)).toEqual([]);
  });
});

describe("toNumberArray", () => {
  it("returns an empty array for null/undefined", () => {
    expect(toNumberArray(null)).toEqual([]);
    expect(toNumberArray(undefined)).toEqual([]);
  });

  it("wraps a single number in an array", () => {
    expect(toNumberArray(3)).toEqual([3]);
  });

  it("filters out non-finite values", () => {
    expect(toNumberArray([1, "not-a-number", 3])).toEqual([1, 3]);
  });
});

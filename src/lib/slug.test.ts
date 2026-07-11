import { describe, it, expect } from "vitest";
import { slugifyBase } from "./slug";

describe("slugifyBase", () => {
  it("lowercases and hyphenates a plain title", () => {
    expect(slugifyBase("Deep Space 9")).toBe("deep-space-9");
  });

  it("transliterates German umlauts and ß", () => {
    expect(slugifyBase("Überlebensfähigkeit")).toBe("ueberlebensfaehigkeit");
    expect(slugifyBase("Straße")).toBe("strasse");
  });

  it("collapses runs of special characters into a single hyphen", () => {
    expect(slugifyBase("Gespräch: Teil 1 & 2!")).toBe("gespraech-teil-1-2");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyBase("--Vorwort--")).toBe("vorwort");
  });

  it("falls back to 'gespraech' when nothing valid remains", () => {
    expect(slugifyBase("???")).toBe("gespraech");
  });

  it("falls back to 'gespraech' for an empty string", () => {
    expect(slugifyBase("")).toBe("gespraech");
  });
});

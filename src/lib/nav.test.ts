import { describe, it, expect } from "vitest";
import { MAIN_NAV } from "./nav";

describe("MAIN_NAV", () => {
  it("has a unique id and href for every entry", () => {
    const ids = MAIN_NAV.map((item) => item.id);
    const hrefs = MAIN_NAV.map((item) => item.href);
    expect(new Set(ids).size).toBe(MAIN_NAV.length);
    expect(new Set(hrefs).size).toBe(MAIN_NAV.length);
  });

  it("gives every entry a non-empty label and a leading-slash href", () => {
    for (const item of MAIN_NAV) {
      expect(item.label).toBeTruthy();
      expect(item.href.startsWith("/")).toBe(true);
    }
  });
});

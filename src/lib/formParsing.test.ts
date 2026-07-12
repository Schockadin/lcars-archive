import { describe, it, expect } from "vitest";
import { parseList, parseNumberList } from "./formParsing";

describe("parseList", () => {
  it("splits a comma-separated string and trims whitespace", () => {
    expect(parseList(" a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("removes empty entries", () => {
    expect(parseList("a,,b,")).toEqual(["a", "b"]);
  });

  it("removes duplicates while preserving first-seen order", () => {
    expect(parseList("a,b,a,c,b")).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for null", () => {
    expect(parseList(null)).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseList("")).toEqual([]);
  });

  it("returns an empty array for a string of only whitespace/commas", () => {
    expect(parseList(" , , ")).toEqual([]);
  });
});

describe("parseNumberList", () => {
  it("parses comma-separated integers", () => {
    expect(parseNumberList("1,2,3")).toEqual([1, 2, 3]);
  });

  it("drops non-integer entries", () => {
    expect(parseNumberList("1,abc,3.5,4")).toEqual([1, 4]);
  });

  it("de-duplicates before parsing, same as parseList", () => {
    expect(parseNumberList("1,1,2")).toEqual([1, 2]);
  });

  it("returns an empty array for null", () => {
    expect(parseNumberList(null)).toEqual([]);
  });
});

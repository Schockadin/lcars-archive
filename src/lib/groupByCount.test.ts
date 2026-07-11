import { describe, it, expect } from "vitest";
import { groupByCount } from "./groupByCount";

describe("groupByCount", () => {
  it("groups items by key and counts occurrences", () => {
    const items = [
      { canonical: "Desmond Hobbes", matchedText: "Desmond" },
      { canonical: "Desmond Hobbes", matchedText: "Hobbes" },
      { canonical: "Frederick Helben", matchedText: "Frederick" },
    ];
    const result = groupByCount(
      items,
      (i) => i.canonical,
      (i) => ({ canonical: i.canonical }),
    );
    expect(result).toEqual([
      { canonical: "Desmond Hobbes", count: 2 },
      { canonical: "Frederick Helben", count: 1 },
    ]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupByCount([], (i: never) => String(i), () => ({}))).toEqual([]);
  });

  it("keeps the mapped fields from the FIRST occurrence of a key", () => {
    const items = [
      { key: "a", label: "first" },
      { key: "a", label: "second" },
    ];
    const result = groupByCount(
      items,
      (i) => i.key,
      (i) => ({ label: i.label }),
    );
    expect(result).toEqual([{ label: "first", count: 2 }]);
  });

  it("preserves first-seen order of distinct keys", () => {
    const items = [{ k: "b" }, { k: "a" }, { k: "b" }, { k: "c" }];
    const result = groupByCount(
      items,
      (i) => i.k,
      (i) => ({ k: i.k }),
    );
    expect(result.map((r) => r.k)).toEqual(["b", "a", "c"]);
  });
});

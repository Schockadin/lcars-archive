import { describe, it, expect } from "vitest";
import { TYPE_COLOR, TYPE_FILTER_LABEL } from "./searchFormat";
import type { SearchResultType } from "@/types/search";

const ALL_TYPES: SearchResultType[] = ["character", "mission", "log", "archive"];

describe("TYPE_COLOR / TYPE_FILTER_LABEL", () => {
  it("has a color entry for every SearchResultType", () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_COLOR[type]).toBeTruthy();
    }
  });

  it("has a filter label entry for every SearchResultType", () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_FILTER_LABEL[type]).toBeTruthy();
    }
  });
});

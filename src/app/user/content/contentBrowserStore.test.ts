import { describe, expect, it } from "vitest";
import {
  createContentBrowserStore,
  defaultContentBrowserFilters,
} from "./contentBrowserStore";

describe("content browser store", () => {
  it("isolates two instances and restores their own initial filters", () => {
    const first = createContentBrowserStore();
    const second = createContentBrowserStore({
      ...defaultContentBrowserFilters,
      categoryFilter: "drafts",
    });

    first.getState().setQuery("Voyager");
    first.getState().setSort("title", "desc");
    second.getState().setCharacterFilter("tuvok");

    expect(first.getState().query).toBe("Voyager");
    expect(second.getState().query).toBe("");
    expect(second.getState().categoryFilter).toBe("drafts");
    first.getState().reset();
    second.getState().reset();
    expect(first.getState().sortKey).toBe("category");
    expect(first.getState().query).toBe("");
    expect(second.getState().characterFilter).toBeNull();
    expect(second.getState().categoryFilter).toBe("drafts");
  });
});

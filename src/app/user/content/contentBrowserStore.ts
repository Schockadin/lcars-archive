import { createStore } from "zustand/vanilla";

export type ContentKind =
  | "mission_log"
  | "dialogue"
  | "timeline_event"
  | "archive_entry"
  | "mission";
export type CategoryFilter = "all" | ContentKind | "drafts";
export type SortKey = "category" | "title";
export type SortDirection = "asc" | "desc";

export interface ContentBrowserFilters {
  characterFilter: string | null;
  categoryFilter: CategoryFilter;
  sortKey: SortKey;
  sortDir: SortDirection;
  query: string;
}

export const defaultContentBrowserFilters: ContentBrowserFilters = {
  characterFilter: null,
  categoryFilter: "all",
  sortKey: "category",
  sortDir: "asc",
  query: "",
};

export interface ContentBrowserStore extends ContentBrowserFilters {
  setCharacterFilter: (value: string | null) => void;
  setCategoryFilter: (value: CategoryFilter) => void;
  setSort: (key: SortKey, direction: SortDirection) => void;
  setQuery: (value: string) => void;
  reset: () => void;
}

// Jede Provider-Instanz erhält ihren eigenen Store; niemals Modulzustand für
// nutzerbezogene Daten in einer Server-Component teilen.
export function createContentBrowserStore(
  initial: ContentBrowserFilters = defaultContentBrowserFilters,
) {
  const defaults = { ...initial };
  return createStore<ContentBrowserStore>()((set) => ({
    ...defaults,
    setCharacterFilter: (characterFilter) => set({ characterFilter }),
    setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
    setSort: (sortKey, sortDir) => set({ sortKey, sortDir }),
    setQuery: (query) => set({ query }),
    reset: () => set(defaults),
  }));
}

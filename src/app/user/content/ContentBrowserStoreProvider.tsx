"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createContentBrowserStore,
  type ContentBrowserFilters,
  type ContentBrowserStore,
} from "./contentBrowserStore";

type StoreApi = ReturnType<typeof createContentBrowserStore>;
const ContentBrowserStoreContext = createContext<StoreApi | null>(null);

export function ContentBrowserStoreProvider({
  initial,
  children,
}: {
  initial?: ContentBrowserFilters;
  children: ReactNode;
}) {
  const [store] = useState(() => createContentBrowserStore(initial));
  return (
    <ContentBrowserStoreContext.Provider value={store}>
      {children}
    </ContentBrowserStoreContext.Provider>
  );
}

export function useContentBrowserStore<T>(
  selector: (state: ContentBrowserStore) => T,
): T {
  const store = useContext(ContentBrowserStoreContext);
  if (!store) throw new Error("ContentBrowserStoreProvider fehlt.");
  return useStore(store, selector);
}

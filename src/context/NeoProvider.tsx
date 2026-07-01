// src/context/RuneProvider.tsx
"use client";
import { useCallback, useState, type ReactNode } from "react";
import { NeoContextValue, NeoContext } from "./NeoContext";
import type { NavKey } from "@/lib/nav";

interface NeoProviderProps {
  children: ReactNode;
}

export function NeoProvider({ children }: NeoProviderProps) {
  const [activeSection, setActiveSection] = useState<NavKey>("home");
  const [title, setTitle] = useState<string>("Home");
  const [crumbLabels, setCrumbLabels] = useState<Record<string, string>>({});
  const [readingMode, setReadingMode] = useState<boolean>(false);

  const toggleReadingMode = useCallback(() => setReadingMode((v) => !v), []);

  // Stabil gehalten (useCallback), damit Effekte in den Setzer-Komponenten
  // nicht bei jedem Render neu laufen.
  const setCrumbLabel = useCallback((slug: string, label: string) => {
    setCrumbLabels((prev) =>
      prev[slug] === label ? prev : { ...prev, [slug]: label },
    );
  }, []);
  const clearCrumbLabel = useCallback((slug: string) => {
    setCrumbLabels((prev) => {
      if (!(slug in prev)) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, []);

  const value: NeoContextValue = {
    activeSection,
    setActiveSection,
    title,
    setTitle,
    crumbLabels,
    setCrumbLabel,
    clearCrumbLabel,
    readingMode,
    setReadingMode,
    toggleReadingMode,
  };

  return <NeoContext.Provider value={value}>{children}</NeoContext.Provider>;
}

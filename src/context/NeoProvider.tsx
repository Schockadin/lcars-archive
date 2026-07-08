// src/context/RuneProvider.tsx
"use client";
import { useCallback, useRef, useState, type ReactNode } from "react";
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
  const [editMode, setEditMode] = useState<boolean>(false);
  const preserveReadingModeRef = useRef(false);

  const toggleReadingMode = useCallback(() => setReadingMode((v) => !v), []);
  const toggleEditMode = useCallback(() => setEditMode((v) => !v), []);

  const preserveReadingModeOnce = useCallback(() => {
    preserveReadingModeRef.current = true;
  }, []);

  // Cleanup-Funktion für ReadingModeToggle: setzt den Lesemodus zurück,
  // außer preserveReadingModeOnce wurde direkt vorher (Klick auf einen
  // Log-Vor/Zurück-Link) aufgerufen — dann bleibt er über den Seitenwechsel
  // hinweg erhalten und das Flag wird verbraucht.
  const resetReadingModeOnUnmount = useCallback(() => {
    if (preserveReadingModeRef.current) {
      preserveReadingModeRef.current = false;
      return;
    }
    setReadingMode(false);
  }, []);

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
    preserveReadingModeOnce,
    resetReadingModeOnUnmount,
    editMode,
    setEditMode,
    toggleEditMode,
  };

  return <NeoContext.Provider value={value}>{children}</NeoContext.Provider>;
}

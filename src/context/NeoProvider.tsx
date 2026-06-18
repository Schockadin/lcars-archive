// src/context/RuneProvider.tsx
"use client";
import { useState, type ReactNode } from "react";
import { NeoContextValue, NeoContext } from "./NeoContext";
import type { NavKey } from "@/lib/nav";

interface NeoProviderProps {
  children: ReactNode;
}

export function NeoProvider({ children }: NeoProviderProps) {
  const [activeSection, setActiveSection] = useState<NavKey>("home");
  const [title, setTitle] = useState<string>("Home");

  const value: NeoContextValue = {
    activeSection,
    setActiveSection,
    title,
    setTitle,
  };

  return <NeoContext.Provider value={value}>{children}</NeoContext.Provider>;
}

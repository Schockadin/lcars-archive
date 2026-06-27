"use client";
import { createContext } from "react";
import type { NavKey } from "../lib/nav";

export interface NeoContextValue {
  activeSection: NavKey;
  setActiveSection: (section: NavKey) => void;
  title: string;
  setTitle: (title: string) => void;
  // Slug → echtes Label, damit Breadcrumbs statt der Slug-Ableitung
  // die tatsächlichen Titel (Mission, Log, …) anzeigen können.
  crumbLabels: Record<string, string>;
  setCrumbLabel: (slug: string, label: string) => void;
  clearCrumbLabel: (slug: string) => void;
}

export const NeoContext = createContext<NeoContextValue | undefined>(undefined);

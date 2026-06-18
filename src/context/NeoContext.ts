"use client";
import { createContext } from "react";
import type { NavKey } from "../lib/nav";

export interface NeoContextValue {
  activeSection: NavKey;
  setActiveSection: (section: NavKey) => void;
  title: string;
  setTitle: (title: string) => void;
}

export const NeoContext = createContext<NeoContextValue | undefined>(undefined);

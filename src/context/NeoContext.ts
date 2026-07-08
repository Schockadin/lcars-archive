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
  // Lesemodus (nur mobil): blendet Sidebar/Elbow-Bar aus und maximiert
  // die Lesbarkeit der Inhaltsseite.
  readingMode: boolean;
  setReadingMode: (on: boolean) => void;
  toggleReadingMode: () => void;
  // Für die Vor-/Zurück-Navigation zwischen Logs (LogDetail): markiert den
  // nächsten Unmount von ReadingModeToggle als "Seitenwechsel innerhalb
  // desselben Lesekontexts" — resetReadingModeOnUnmount setzt den
  // Lesemodus dann NICHT zurück.
  preserveReadingModeOnce: () => void;
  resetReadingModeOnUnmount: () => void;

  // Speichert, ob ein Inhalt gerade editiert wird
  editMode: boolean;
  setEditMode: (toggle: boolean) => void;
  toggleEditMode: () => void;
}

export const NeoContext = createContext<NeoContextValue | undefined>(undefined);

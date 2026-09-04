"use client";
import type { ReactNode } from "react";
import { PencilIcon, XIcon } from "@/lib/icons";

// Gemeinsame Hülle der drei Panels der eigenen Charakterseite (Stammdaten,
// Werte, Biografie): Titelleiste im Bogen-Stil, rechts optional der
// Bearbeiten-Knopf. Bewusst dieselbe Optik wie die Abschnitte des
// Werte-Editors, damit die Seite als ein Block liest und nicht als drei
// verschiedene Formulare.
export default function CharacterPanel({
  en,
  de,
  editing,
  onToggleEdit,
  editLabel = "Bearbeiten",
  children,
}: {
  en: string;
  de: string;
  // Ohne onToggleEdit gibt es keinen Knopf (Werte-Panel: dort wird direkt
  // bearbeitet, ein Umschalter wäre nur ein zusätzlicher Klick).
  editing?: boolean;
  onToggleEdit?: () => void;
  editLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="stat-sheet-section">
      <h2 className="stat-sheet-section-title">
        {en} <span className="stat-label-secondary">{de}</span>
        {onToggleEdit && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="lcars-icon-btn ml-auto"
            aria-label={editing ? "Bearbeiten abbrechen" : editLabel}
            title={editing ? "Bearbeiten abbrechen" : editLabel}
            aria-pressed={editing}
          >
            {editing ? <XIcon /> : <PencilIcon />}
          </button>
        )}
      </h2>
      {children}
    </section>
  );
}

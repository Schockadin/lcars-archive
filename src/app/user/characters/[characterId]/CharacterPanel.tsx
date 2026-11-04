"use client";
import type { ReactNode } from "react";
import { PencilIcon, XIcon } from "@/lib/icons";

// Gemeinsame feste Hülle der Panels der eigenen Charakterseite: Titelleiste
// im Bogen-Stil, rechts optional der Bearbeiten-Knopf.
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
    <section className="stat-sheet-section stat-sheet-panel">
      <div className="stat-sheet-section-title">
        <h2 className="stat-sheet-panel-heading">
          {en} <span className="stat-label-secondary">{de}</span>
        </h2>
        {onToggleEdit && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleEdit();
            }}
            className="lcars-icon-btn ml-auto"
            aria-label={editing ? "Bearbeiten abbrechen" : editLabel}
            title={editing ? "Bearbeiten abbrechen" : editLabel}
            aria-pressed={editing}
          >
            {editing ? <XIcon /> : <PencilIcon />}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

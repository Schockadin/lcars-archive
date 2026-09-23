"use client";
import type { ReactNode } from "react";
import { PencilIcon, XIcon } from "@/lib/icons";

// Gemeinsame aufklappbare Hülle der Panels der eigenen Charakterseite:
// Titelleiste im Bogen-Stil, rechts optional der Bearbeiten-Knopf. Natives
// <details> hält Tastaturbedienung und Verhalten ohne zusätzlichen State
// bereit; alle Panels beginnen offen.
export default function CharacterPanel({
  en,
  de,
  editing,
  onToggleEdit,
  editLabel = "Bearbeiten",
  children,
  defaultOpen = true,
}: {
  en: string;
  de: string;
  // Ohne onToggleEdit gibt es keinen Knopf (Werte-Panel: dort wird direkt
  // bearbeitet, ein Umschalter wäre nur ein zusätzlicher Klick).
  editing?: boolean;
  onToggleEdit?: () => void;
  editLabel?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="stat-sheet-section stat-sheet-panel" open={defaultOpen}>
      <summary className="stat-sheet-section-title">
        <span
          className="lcars-data-row-chevron stat-sheet-panel-chevron"
          aria-hidden="true"
        />
        <h2 className="stat-sheet-panel-heading">
          {en} <span className="stat-label-secondary">{de}</span>
        </h2>
        {onToggleEdit && (
          <button
            type="button"
            onClick={(event) => {
              // Der Stift liegt in <summary>, soll aber ausschließlich den
              // Bearbeitungsmodus wechseln und nicht zugleich zuklappen.
              event.preventDefault();
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
      </summary>
      {children}
    </details>
  );
}

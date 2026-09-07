"use client";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { XIcon } from "@/lib/icons";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { useReturnFocus } from "@/hooks/useReturnFocus";

// Der gemeinsame Rahmen aller Eingabe-Fenster: Portal an <body>, Escape
// schließt, ein Klick daneben schließt, der Hintergrund scrollt nicht mit
// (useOverlayDismiss), und der Fokus kehrt beim Schließen an den Knopf zurück,
// der das Fenster geöffnet hat (useReturnFocus).
//
// Das Muster stand vorher in jedem Overlay einzeln (RowDetailModal,
// EntryAddModal, TalentPicker …) — die Kopfzeile mit Titel und Schließen-Kreuz
// ebenso. Wer nur ein Formular in einem Fenster braucht, nimmt diesen Rahmen
// und schreibt nur noch den Inhalt.
export default function ModalOverlay({
  title,
  onClose,
  children,
  width = 640,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Maximale Breite in Pixeln — ein Formular mit Teilnehmerliste braucht mehr
  // Platz als eine einzelne Eingabezeile.
  width?: number;
}) {
  useReturnFocus(true);
  useOverlayDismiss(onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col gap-[12px] overflow-y-auto rounded-[8px] border border-lcars-border bg-lcars-surface p-[20px]"
        style={{ maxWidth: `${width}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-primary-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="lcars-icon-btn"
            aria-label="Schließen"
          >
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

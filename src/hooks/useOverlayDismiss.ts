"use client";
import { useEffect } from "react";

// Tastatur und Scroll-Verhalten eines geöffneten Overlays (Modal, Lightbox,
// Vollbild): Escape schließt, der Hintergrund scrollt nicht mit, optional
// blättern die Pfeiltasten durch ein Karussell.
//
// Vorher stand dieser Effekt achtmal fast wortgleich in den einzelnen
// Overlays (RowDetailModal, TalentPicker, EntryAddModal, CharacterPortrait,
// ContentBody, DbTableExplorer, CharacterStatsForm, PersonnelFileView) — samt
// der leicht zu übersehenden Feinheit, den vorherigen overflow-Wert des
// <body> zu merken und beim Schließen zurückzugeben (nicht auf "" oder
// "auto" zu setzen: darunter liegt bei uns die AppShell mit ihrem eigenen
// overflow, siehe globals.css) — inklusive einer Falle, die dabei in allen
// acht Kopien steckte (siehe unten).
//
// `active` = ist das Overlay gerade offen? Komponenten, die erst beim Öffnen
// gemountet werden, übergeben schlicht true — gleiche Bedeutung wie bei
// useReturnFocus, das meist direkt daneben steht.
export function useOverlayDismiss(
  onClose: () => void,
  options: {
    active?: boolean;
    // Karussell-Navigation (ContentBody, CharacterPortrait). Fehlen sie,
    // bleiben die Pfeiltasten unbehandelt.
    onPrev?: () => void;
    onNext?: () => void;
  } = {},
): void {
  const { active = true, onPrev, onNext } = options;

  // Zwei getrennte Effekte, bewusst: die Scroll-Sperre hängt NUR an
  // `active`. Läge sie im selben Effekt wie der Tastatur-Listener (der auch
  // an den Callbacks hängt), würde ein Aufrufer mit inline definiertem
  // onClose bei jedem Render einen Cleanup auslösen — der sich dann den
  // bereits gesperrten Wert "hidden" als "vorherigen" merkt und ihn beim
  // Schließen wiederherstellt. Der Hintergrund bliebe für immer gesperrt.
  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose, onPrev, onNext]);
}

"use client";
import { useEffect, useRef } from "react";

// Gibt den Tastatur-Fokus nach dem Schließen eines Overlays (Modal, Lightbox,
// Dropdown) an das auslösende Element zurück — sonst „verlieren" Tastatur-/
// Screenreader-Nutzer:innen ihren Platz und landen am Seitenanfang.
//
// `active` = ist das Overlay gerade offen? Beim Übergang auf offen wird das
// zuletzt fokussierte Element gemerkt; die Cleanup-Funktion (Übergang auf
// geschlossen ODER Unmount des Overlays) stellt den Fokus dort wieder her. So
// funktioniert derselbe Hook für Komponenten, die dauerhaft gemountet bleiben
// und `active` umschalten (CharacterPortrait, ContentBody), wie für solche, die
// erst beim Öffnen gemountet werden (RowDetailModal — dort `active={true}`).
export function useReturnFocus(active: boolean): void {
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) return;
    previous.current = document.activeElement as HTMLElement | null;
    return () => {
      previous.current?.focus?.();
      previous.current = null;
    };
  }, [active]);
}

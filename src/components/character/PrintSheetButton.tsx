"use client";
import { PrinterIcon } from "@/lib/icons";

// Druckt die Bogen-Blätter über den Browser — dasselbe wie der
// Drucken-Knopf im Vorschau-Fenster (CharacterSheetPreviewOverlay). Das
// Druck-CSS in personnel-file.css blendet dabei alles außer den Blättern aus
// und beginnt jedes auf einer neuen Seite.
//
// Eigene kleine Client-Komponente, weil die Bogen-Seite
// (/characters/[slug]/sheet) sonst serverseitig bliebe.
export default function PrintSheetButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="lcars-icon-btn"
      aria-label="Bogen drucken"
      title="Bogen drucken"
    >
      <PrinterIcon />
    </button>
  );
}

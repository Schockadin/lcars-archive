"use client";
import { useCallback } from "react";
import { createPortal } from "react-dom";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { useReturnFocus } from "@/hooks/useReturnFocus";
import { DownloadIcon, PrinterIcon, XIcon } from "@/lib/icons";
import CharacterSheetPreview, {
  type CharacterSheetPreviewInput,
} from "./CharacterSheetPreview";

// Vorschau-Fenster des Charakterbogens: die drei Blätter im Vollbild, oben
// eine Leiste mit „Drucken" und „Speichern".
//
// Gedruckt wird über den Browser (window.print) — das Druck-CSS in
// personnel-file.css blendet dafür alles außer den Blättern aus und beginnt
// jedes auf einer neuen Seite. Gespeichert wird die PDF-Fassung derselben drei
// Blätter (siehe /api/export/character-sheet); bewusst der Server-PDF und
// nicht „Als PDF drucken", damit die Datei unabhängig vom Browser gleich
// aussieht.
//
// Gleiches Overlay-Muster wie TalentPicker/EntryAddModal: Portal, Escape
// schließt, Klick daneben schließt, Scroll-Sperre.
export default function CharacterSheetPreviewOverlay({
  input,
  downloadUrl,
  onClose,
}: {
  input: CharacterSheetPreviewInput;
  // Null im Anlege-Assistenten: dort gibt es den Charakter noch nicht, also
  // auch keine Datei zum Speichern.
  downloadUrl: string | null;
  onClose: () => void;
}) {
  useReturnFocus(true);
  const close = useCallback(() => onClose(), [onClose]);
  useOverlayDismiss(close);

  return createPortal(
    <div
      className="pf-preview-overlay fixed inset-0 z-[1200] overflow-y-auto bg-lcars-bg p-[12px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Charakterbogen: ${input.characterName}`}
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-w-[860px] flex-col gap-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pf-preview-bar flex items-center justify-between gap-[12px]">
          <h2 className="text-lcars-primary-ink">{input.characterName}</h2>
          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => window.print()}
              className="lcars-icon-btn"
              aria-label="Bogen drucken"
              title="Bogen drucken"
            >
              <PrinterIcon />
            </button>
            {downloadUrl && (
              // Download über einen Link statt einer Action: der Browser lädt
              // die Datei dann direkt über Content-Disposition herunter.
              <a
                href={downloadUrl}
                download
                className="lcars-icon-btn"
                aria-label="Bogen als PDF speichern"
                title="Bogen als PDF speichern"
              >
                <DownloadIcon />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="lcars-icon-btn"
              aria-label="Vorschau schließen"
              title="Vorschau schließen"
            >
              <XIcon />
            </button>
          </div>
        </div>

        <CharacterSheetPreview input={input} />
      </div>
    </div>,
    document.body,
  );
}

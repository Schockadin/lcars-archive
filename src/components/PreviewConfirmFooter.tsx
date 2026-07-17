"use client";
import { CheckIcon, XIcon } from "@/lib/icons";

// Abbrechen/Übernehmen-Footer der Vorschau-vor-Speichern-Buttons
// (AutolinkButton.tsx, RemoveWikilinksButton.tsx) — beide nutzen bereits
// usePreviewConfirmAction für den State, hier nur das gemeinsame Footer-JSX.
// Icon- statt Textbuttons (gleiches Muster wie DialogueMessageActions.tsx),
// dadurch auf schmalen Bildschirmen kompakter und ohne Zeilenumbruch.
export default function PreviewConfirmFooter({
  onCancel,
  onConfirm,
  pending,
  canConfirm,
  className = "flex gap-[12px] items-center justify-end",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  canConfirm: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="lcars-icon-btn lcars-icon-btn--danger size-[40px] disabled:opacity-50"
        aria-label="Abbrechen"
        title="Abbrechen"
      >
        <XIcon />
      </button>
      {canConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="lcars-icon-btn size-[40px] disabled:opacity-50"
          aria-label={pending ? "Wird gespeichert…" : "Übernehmen"}
          title={pending ? "Wird gespeichert…" : "Übernehmen"}
        >
          <CheckIcon />
        </button>
      )}
    </div>
  );
}

"use client";

// Abbrechen/Übernehmen-Footer der Vorschau-vor-Speichern-Buttons
// (AutolinkButton.tsx, RemoveWikilinksButton.tsx) — beide nutzen bereits
// usePreviewConfirmAction für den State, hier nur das gemeinsame Footer-JSX.
export default function PreviewConfirmFooter({
  onCancel,
  onConfirm,
  pending,
  canConfirm,
  className = "flex gap-[12px] items-center justify-end",
  buttonClassName = "lcars-pill-btn--outline",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  canConfirm: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className={buttonClassName}
      >
        Abbrechen
      </button>
      {canConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`${buttonClassName} disabled:opacity-50`}
        >
          {pending ? "Speichern…" : "Übernehmen"}
        </button>
      )}
    </div>
  );
}

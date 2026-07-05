"use client";

// Bestätigungsgeschützter, destruktiver Aktions-Button ("Gefahrenzone") —
// vorher in UserStatusActions.tsx und EditMissionForm.tsx als identisches
// <form>+confirm()+<button>-Paar dupliziert. pendingLabel optional: ohne
// wechselt der Button-Text während des Ladens nicht (z.B. User löschen
// zeigt keinen eigenen Ladetext, Mission löschen schon — beides bleibt wie
// zuvor möglich).
export function DangerZoneButton({
  formAction,
  hiddenFields,
  pending,
  disabled = false,
  confirmMessage,
  label,
  pendingLabel,
  title,
  className = "lcars-switch disabled:opacity-50",
}: {
  formAction: (formData: FormData) => void;
  hiddenFields: Record<string, string | number>;
  pending: boolean;
  disabled?: boolean;
  confirmMessage: string;
  label: string;
  pendingLabel?: string;
  title?: string;
  className?: string;
}) {
  return (
    <form action={formAction}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        disabled={pending || disabled}
        className={className}
        title={title}
        onClick={(e) => {
          if (!confirm(confirmMessage)) {
            e.preventDefault();
          }
        }}
      >
        {pending && pendingLabel ? pendingLabel : label}
      </button>
    </form>
  );
}

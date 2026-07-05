// Wiederverwendete Bausteine für die Formulare im User-Bereich (Profil,
// Settings, Missionen, Mission-Logs, Dialoge, Adminpanel) — vorher in jedem
// Formular identisch dupliziert (Label+Feld-Wrapper, Fehler-/Erfolgstext,
// Submit-Button). Rein präsentational, kein eigener State — jedes Formular
// bleibt für seine Felder/Action selbst verantwortlich.

// Label + Abstand + optionaler Hinweistext unter dem Feld, gleiche Struktur
// wie bisher in jedem Formular (`<div className="flex flex-col gap-[6px]">`).
export function FormField({
  label,
  htmlFor,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <label htmlFor={htmlFor} className="lcars-eyebrow">
        {label}
      </label>
      {children}
      {hint && <p className="text-lcars-text-dim text-[12px]">{hint}</p>}
    </div>
  );
}

// `{state?.error && <FormError message={state.error} />}` statt der
// wiederholten <p className="text-lcars-red" role="alert"> überall.
export function FormError({
  message,
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={`text-lcars-red ${className}`} role="alert">
      {message}
    </p>
  );
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-lcars-green" role="status">
      {children}
    </p>
  );
}

// Submit-Button mit Pending-Text-Wechsel — className bleibt überschreibbar,
// da sich Ausrichtung (self-start/self-end) und Breite je Formular
// unterscheiden.
export function SubmitButton({
  pending,
  pendingLabel,
  children,
  className = "lcars-switch self-start disabled:opacity-50 w-[100%]",
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

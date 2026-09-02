"use client";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast/ToastProvider";

// Wiederverwendete Bausteine für die Formulare im User-Bereich (Profil,
// Settings, Missionen, Mission-Logs, Dialoge, Adminpanel) — vorher in jedem
// Formular identisch dupliziert (Label+Feld-Wrapper, Fehler-/Erfolgstext,
// Submit-Button). Rein präsentational, kein eigener State — jedes Formular
// bleibt für seine Felder/Action selbst verantwortlich.
//
// FormError/FormSuccess rendern KEINEN Inline-Text mehr, sondern lösen einen
// app-weiten Toast aus (siehe ToastProvider) — so werden alle Formular-
// Rückmeldungen einheitlich als Toast angezeigt, ohne jedes Formular einzeln
// umzubauen. Beide rendern selbst null.

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
    <div className={`flex flex-col gap-[6px] mb-[8px] ${className}`}>
      <label htmlFor={htmlFor} className="lcars-eyebrow">
        {label}
      </label>
      {children}
      {hint && <p className="text-lcars-ink-dim text-[12px]">{hint}</p>}
    </div>
  );
}

// Zeigt eine Fehlermeldung als Toast (statt Inline-Text). Effekt reagiert auf
// eine geänderte, nicht-leere message — so löst jede neue Fehlermeldung aus
// einer Server-Action einen Toast aus. `className` bleibt aus Kompatibilität in
// der Signatur, wird aber nicht mehr genutzt.
export function FormError({
  message,
}: {
  message?: string;
  className?: string;
}) {
  const { showToast } = useToast();
  const lastRef = useRef<string | undefined>(undefined);
  // Die Fehlermeldung kommt aus dem Rückgabewert einer Server-Action
  // (useActionState) — es gibt keinen synchronen Event-Handler, in dem sie
  // vorläge, daher ist ein Effekt hier der richtige Ort, um die Action-
  // Rückmeldung mit dem externen Toast-System zu synchronisieren. showToast ist
  // stabil (useCallback im Provider).
  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- Action-Ergebnis, kein UI-Event
    if (message && message !== lastRef.current) {
      showToast(message, { kind: "error" });
    }
    lastRef.current = message;
  }, [message, showToast]);
  return null;
}

// Zeigt eine Erfolgsmeldung als Toast. Wird typischerweise bedingt gerendert
// (`{state?.success && <FormSuccess>…</FormSuccess>}`) und mountet damit bei
// jedem Erfolg neu — der Effekt feuert deshalb einmal pro Mount.
export function FormSuccess({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    showToast(children, { kind: "success" });
  }, [children, showToast]);
  return null;
}

// Submit-Button mit Pending-Text-Wechsel — className bleibt überschreibbar,
// da sich Ausrichtung (self-start/self-end) und Breite je Formular
// unterscheiden.
export function SubmitButton({
  pending,
  pendingLabel,
  children,
  className = "lcars-pill-btn--outline self-start disabled:opacity-50 w-[100%]",
  onClick,
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  className?: string;
  // Optionaler Klick-Handler, z.B. für ein confirm() vor dem Absenden
  // (verhindert den Submit per preventDefault, siehe confirmSubmit).
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={onClick}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

// Abschluss eines Einstellungs-Formulars: Fehler- und Erfolgs-Toast plus der
// „Speichern"-Knopf. Stand in den Formularen des Profils (Konto, Benachrichti-
// gungen, News, Theme, UI-Modus, Rechtschreibprüfung) und in der User-
// Verwaltung siebenmal wortgleich da.
//
// `state` ist der Rückgabewert der jeweiligen Server-Action (useActionState);
// erwartet werden nur die beiden üblichen Felder — ohne success-Feld bleibt
// die Erfolgsmeldung schlicht aus (so wie beim Bearbeiten eines Users).
export function SaveFooter({
  state,
  pending,
}: {
  state?: { error?: string; success?: boolean };
  pending: boolean;
}) {
  return (
    <>
      <FormError message={state?.error} />
      {state?.success && <FormSuccess>Gespeichert.</FormSuccess>}

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>
    </>
  );
}

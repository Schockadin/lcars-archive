"use client";
import { useOptimistic, useState, useTransition } from "react";
import { setVisibilityAction, type VisibilityContentType } from "./actions";
import type { Visibility } from "@/lib/visibility";

// Eigene Label-Liste statt VISIBILITY_LABELS aus @/lib/visibility zu
// importieren — jenes Modul ist "server-only" und darf aus einer Client
// Component nicht als Wert (nur als Typ) importiert werden.
const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Privat" },
  { value: "gm", label: "GM" },
  { value: "public", label: "Öffentlich" },
];

export default function VisibilitySelect({
  contentType,
  id,
  initialValue,
}: {
  contentType: VisibilityContentType;
  id: number;
  initialValue: Visibility;
}) {
  // useOptimistic statt useState: zeigt den neuen Wert sofort an, fällt aber
  // automatisch auf initialValue zurück, sobald die Transition abgeschlossen
  // ist UND initialValue sich NICHT geändert hat (weil setVisibilityAction
  // fehlgeschlagen ist und revalidatePath deshalb den alten DB-Stand
  // zurückliefert) — kein manueller Rollback-Code nötig.
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-[2px]">
      <select
        value={optimisticValue}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Visibility;
          setError(null);
          startTransition(async () => {
            setOptimisticValue(next);
            const result = await setVisibilityAction(contentType, id, next);
            if (result.error) setError(result.error);
          });
        }}
        className="lcars-input rounded-full"
        aria-label="Sichtbarkeit"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-lcars-quinary-ink text-[11px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

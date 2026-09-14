"use client";
import { useOptimistic, useState, useTransition } from "react";
import { setContentStateAction, type VisibilityContentType } from "./actions";

// Entwurf oder veröffentlicht — der eine Sichtbarkeits-Schalter jedes Inhalts
// (bis v1.34 waren es drei Stufen „Privat/GM/Öffentlich" PLUS ein
// Entwurf-Häkchen im Editor). Hier steht er direkt in der Liste: Ein Entwurf
// lässt sich veröffentlichen, ohne ihn erst im Editor zu öffnen.
//
// Eigene Label-Liste statt CONTENT_STATE_LABEL aus @/lib/visibility zu
// importieren — jenes Modul ist "server-only" und darf aus einer Client
// Component nicht als Wert (nur als Typ) importiert werden.
type ContentState = "draft" | "published";

const OPTIONS: { value: ContentState; label: string }[] = [
  { value: "draft", label: "Entwurf" },
  { value: "published", label: "Veröffentlicht" },
];

export default function ContentStateSelect({
  contentType,
  id,
  isDraft,
}: {
  contentType: VisibilityContentType;
  id: number;
  isDraft: boolean;
}) {
  const initialValue: ContentState = isDraft ? "draft" : "published";
  // useOptimistic statt useState: zeigt den neuen Wert sofort an, fällt aber
  // automatisch auf initialValue zurück, sobald die Transition abgeschlossen
  // ist UND initialValue sich NICHT geändert hat (weil setContentStateAction
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
          const next = e.target.value as ContentState;
          setError(null);
          startTransition(async () => {
            setOptimisticValue(next);
            const result = await setContentStateAction(contentType, id, next);
            if (result.error) setError(result.error);
          });
        }}
        className="lcars-input rounded-full"
        aria-label="Veröffentlichung"
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

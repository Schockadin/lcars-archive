"use client";
import { useOptimistic, useState, useTransition } from "react";
// Direkt aus der Datei statt über den @/components/lcars-Barrel: der zieht
// (über Header/Sidebar) die Login-Actions und damit die Datenschicht nach —
// in einem reinen UI-Test dieser Komponente scheitert das an DATABASE_URL.
import LcarsSwitch from "@/components/lcars/Switch";
import { setContentStateAction, type VisibilityContentType } from "./actions";

// Entwurf oder veröffentlicht — der eine Sichtbarkeits-Schalter jedes Inhalts
// (bis v1.34 waren es drei Stufen „Privat/GM/Öffentlich" PLUS ein
// Entwurf-Häkchen im Editor). Hier steht er direkt in der Liste: Ein Entwurf
// lässt sich veröffentlichen, ohne ihn erst im Editor zu öffnen.
//
// Zwei Knöpfe (LcarsSwitch) statt eines <select>: Ein geschlossenes
// <select> behält nach der Auswahl den Fokus, und ein fokussiertes <select>
// wechselt bei JEDEM Pfeiltasten-Druck (Chrome/Firefox) bzw. Mausrad (Firefox)
// zur nächsten Option und feuert dabei ein change-Ereignis. Wer also einen
// Inhalt auf „Entwurf" stellte und danach mit der Tastatur weiterscrollte,
// veröffentlichte ihn Sekunden später versehentlich wieder — inklusive
// Benachrichtigung an alle Abonnenten, denn „Entwurf" ist die erste und
// „Veröffentlicht" die nächste Option. Knöpfe kennen diese Drift nicht:
// Pfeiltasten, Bild-ab und Mausrad scrollen dort die Seite, und Leer-/
// Eingabetaste lösen nur den Knopf aus, auf dem der Fokus ohnehin steht —
// also den bereits aktiven Zustand (siehe den Gleichheits-Check unten).
//
// Eigene Zustands-/Label-Liste statt CONTENT_STATE_LABEL aus @/lib/visibility
// zu importieren — jenes Modul ist "server-only" und darf aus einer Client
// Component nicht als Wert (nur als Typ) importiert werden.
type ContentState = "draft" | "published";

const OPTIONS: { key: ContentState; label: string }[] = [
  { key: "draft", label: "Entwurf" },
  { key: "published", label: "Veröffentlicht" },
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
      {/* role="group" + Beschriftung: Die beiden Knöpfe tragen zwar je ihre
          eigene Beschriftung und aria-pressed, ohne Gruppennamen bliebe aber
          offen, WORÜBER sie entscheiden — in einer Liste mit einem solchen
          Paar je Zeile ist genau das die nötige Angabe. */}
      <div role="group" aria-label="Veröffentlichung">
        <LcarsSwitch
          className="content-state-switch"
          // Ohne flex-1: „Veröffentlicht" ist mehr als doppelt so lang wie
          // „Entwurf" — in zwei gleich breiten Hälften lief das längere Wort
          // auf dem Telefon aus seiner Hälfte heraus und wurde vom
          // overflow:hidden der Pille abgeschnitten. Hier bekommt jede Hälfte
          // die Breite ihrer Beschriftung.
          itemClassName="lcars-switch-item"
          options={OPTIONS.map((o) => ({ ...o, disabled: pending }))}
          active={optimisticValue}
          onChange={(next) => {
            // Der bereits aktive Zustand ist kein Wechsel: kein Schreibzugriff,
            // keine Benachrichtigung — und damit auch kein Schaden, wenn die
            // Leertaste den fokussierten Knopf noch einmal auslöst.
            if (next === optimisticValue) return;
            setError(null);
            startTransition(async () => {
              setOptimisticValue(next);
              const result = await setContentStateAction(contentType, id, next);
              if (result.error) setError(result.error);
            });
          }}
        />
      </div>
      {error && (
        <p className="text-lcars-quinary-ink text-[11px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

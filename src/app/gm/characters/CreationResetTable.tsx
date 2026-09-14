"use client";

import { useActionState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  reopenCreationAction,
  type CreationResetState,
} from "./creationActions";
import type { PendingAdvancement } from "@/types/characterStats";

const initialState: CreationResetState = {};

export interface CreationStateRow {
  id: number;
  name: string;
  playerName: string | null;
  creationLocked: boolean;
  pending: PendingAdvancement[];
}

// Erschaffungs-Status aller Charaktere mit dem Knopf, eine abgeschlossene
// Erschaffung wieder zu öffnen.
//
// Eine Meldung für die ganze Liste statt einer je Zeile: es wird immer nur ein
// Charakter auf einmal zurückgesetzt, und die Meldung ist lang (was
// zurückgenommen wurde, welche AP gebucht wurden) — je Zeile eine eigene
// wäre ein Kasten, der die Tabelle auseinanderzieht.
export default function CreationResetTable({
  rows,
}: {
  rows: CreationStateRow[];
}) {
  const [state, formAction, pending] = useActionState(
    reopenCreationAction,
    initialState,
  );

  if (rows.length === 0) {
    return <p className="lcars-empty-state">Keine Charaktere vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-col gap-[4px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            <span className="font-lcars text-lcars-ink-data flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
              {row.name}
              {row.playerName ? (
                <span className="stat-label-secondary"> · {row.playerName}</span>
              ) : null}
            </span>

            {row.creationLocked ? (
              <form action={formAction}>
                <input type="hidden" name="characterId" value={row.id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="lcars-pill-btn--outline disabled:opacity-50"
                  onClick={confirmSubmit(
                    `Erschaffung von „${row.name}" wieder öffnen? Alle Steigerungen seit dem Abschluss werden zurückgenommen — die AP kommen aufs Konto zurück, und die Steigerungen werden notiert und beim erneuten Abschließen automatisch wieder angewandt.`,
                  )}
                >
                  Erschaffung wieder öffnen
                </button>
              </form>
            ) : (
              <span className="stat-label-secondary">in Erschaffung</span>
            )}
          </div>

          {row.pending.length > 0 && (
            <p className="text-lcars-ink-dim text-[13px]">
              Notiert für den erneuten Abschluss:{" "}
              {row.pending.map((entry) => entry.label).join(", ")}
            </p>
          )}
        </div>
      ))}

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>{state.success}</FormSuccess>}
    </div>
  );
}

"use client";
import { useActionState } from "react";
import {
  linkAllContentAction,
  type LinkAllContentState,
} from "@/app/actions/autolinkAll";

const initialState: LinkAllContentState = {};

// Admin-only (siehe page.tsx) — wendet Autolinking auf ALLE bestehenden
// Inhalte an (Charaktere, Missionen, Mission-Logs, Archiv-Einträge), statt
// jeden Inhalt einzeln über das Werkzeug auf seiner Detailseite verlinken zu
// müssen. Kann bei vielen Inhalten einen Moment dauern.
export default function LinkAllContentPanel() {
  const [state, formAction, pending] = useActionState(
    linkAllContentAction,
    initialState,
  );

  return (
    <form action={formAction} className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Erkennt in allen bestehenden Inhalten erwähnte Charaktere, Missionen und
        Archiv-Einträge und verlinkt sie automatisch. Nur Inhalte mit neuen
        Verknüpfungen werden geändert.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Verlinke alle Inhalte…" : "Alle Inhalte verlinken"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      {state?.changedCount != null && (
        <p className="text-lcars-amber">
          {state.changedCount} von {state.totalScanned} Inhalten verlinkt (
          {state.linkCount} Verknüpfungen gesetzt).
        </p>
      )}
    </form>
  );
}

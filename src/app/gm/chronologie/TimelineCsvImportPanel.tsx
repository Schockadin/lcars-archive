"use client";

import { useActionState } from "react";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import { importTimelineCsvAction, type TimelineActionState } from "./actions";
import {
  TIMELINE_CSV_TEMPLATE,
  TIMELINE_CSV_TEMPLATE_FILENAME,
} from "@/lib/timelineCsvImport";

const initialState: TimelineActionState = {};

export default function TimelineCsvImportPanel() {
  const [state, formAction, pending] = useActionState(
    importTimelineCsvAction,
    initialState,
  );
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    `\uFEFF${TIMELINE_CSV_TEMPLATE}`,
  )}`;

  return (
    <section className="flex flex-col gap-[10px] border-b border-lcars-border pb-[24px]">
      <h2 className="lcars-eyebrow">Eigene Ereignisse importieren</h2>
      <p className="text-lcars-ink-dim text-[13px]">
        Die erste Zeile muss exakt{" "}
        <code>Datum;Titel;Teaser;Text;Charaktere</code>
        enthalten. Datumswerte folgen <code>JJJJ-MM-TT</code>; mehrere Figuren
        werden in der letzten Spalte mit Kommas getrennt. Semikolons und
        Zeilenumbrüche im Text sind in Anführungszeichen erlaubt.
      </p>
      <a
        href={templateHref}
        download={TIMELINE_CSV_TEMPLATE_FILENAME}
        className="lcars-pill-btn--outline self-start"
      >
        Leere Muster-CSV herunterladen
      </a>
      <form action={formAction} className="flex flex-col gap-[8px]">
        <FormField
          label="CSV-Datei"
          htmlFor="timeline-csv-file"
          hint="Maximal 1 MB und 500 Ereignisse. Alle Zeilen werden gemeinsam geprüft und gespeichert."
        >
          <input
            id="timeline-csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="lcars-input"
          />
        </FormField>
        <FormError message={state.error} />
        {state.success && <FormSuccess>{state.success}</FormSuccess>}
        <SubmitButton
          pending={pending}
          pendingLabel="Importiert…"
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          CSV importieren
        </SubmitButton>
      </form>
    </section>
  );
}

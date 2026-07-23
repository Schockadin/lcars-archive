"use client";
import { useActionState, useState } from "react";
import { LcarsCodeEditor } from "@/components/lcars";
import DbTableRows from "./DbTableRows";
import { runAdminSqlQueryAction, type SqlQueryState } from "./sqlQueryActions";

const initialState: SqlQueryState = {};
const PLACEHOLDER = "SELECT * FROM characters ORDER BY name LIMIT 20";

// Freies, schreibgeschütztes SQL-Query-Feld für Admins — Ausführung läuft
// server-seitig über runAdminSqlQueryAction/runReadOnlyQuery (READ ONLY-
// Transaktion, siehe dbInspect.ts). Editor + Syntaxhighlighting kommen von
// CodeEditor.tsx (CodeMirror) — die vorherige, selbstgebaute "transparente
// Textarea über farbigem <pre>"-Technik driftete je nach Font-Vererbung
// zwischen sichtbarem Text und Cursor auseinander.
export default function SqlQueryPanel() {
  const [query, setQuery] = useState("");
  const [state, formAction, pending] = useActionState(
    runAdminSqlQueryAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <form action={formAction} className="flex flex-col gap-[12px]">
        <LcarsCodeEditor
          value={query}
          onChange={setQuery}
          language="sql"
          placeholder={PLACEHOLDER}
          name="query"
        />
        <button
          type="submit"
          disabled={pending}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          {pending ? "Führe aus…" : "Ausführen"}
        </button>
      </form>

      {state.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      {state.rows && state.columns && (
        <div className="flex flex-col gap-[8px]">
          <p className="text-lcars-text-dim text-[13px]">
            {state.rows.length} Zeile(n)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-lcars-amber">
                  {state.columns.map((c) => (
                    <th
                      key={c}
                      className="lcars-eyebrow pr-[16px] pb-[8px] whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <DbTableRows columns={state.columns} rows={state.rows} />
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

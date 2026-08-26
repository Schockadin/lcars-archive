"use client";
import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import DbTableRows from "./DbTableRows";
import { runAdminSqlQueryAction, type SqlQueryState } from "./sqlQueryActions";

// CodeMirror ist ein schwerer Client-Bundle — nur bei Bedarf laden (dieses
// admin-only Panel wird selten geöffnet). ssr:false, da CodeMirror den
// DOM/Browser braucht.
const LcarsCodeEditor = dynamic(() => import("@/components/lcars/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="lcars-input rounded-lcars min-h-[120px] px-[12px] py-[8px] text-lcars-text-dim text-[13px]">
      Editor lädt…
    </div>
  ),
});

const initialState: SqlQueryState = {};

export interface SqlPanelCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

// Freies SQL-Query-Feld — die serverseitige Ausführung (runAdminSqlQueryAction
// → runAdminQuery) gestattet je nach DB-Recht des Users SELECT/WITH (sql_read),
// INSERT/UPDATE (sql_write) und DELETE (sql_delete). caps steuert nur die
// Anzeige (Hinweistext/Placeholder); die tatsächliche Durchsetzung passiert
// serverseitig. Editor + Syntaxhighlighting kommen von CodeEditor.tsx
// (CodeMirror).
export default function SqlQueryPanel({ caps }: { caps: SqlPanelCapabilities }) {
  const [query, setQuery] = useState("");
  const [state, formAction, pending] = useActionState(
    runAdminSqlQueryAction,
    initialState,
  );

  const allowed = [
    caps.canRead ? "lesen (SELECT)" : null,
    caps.canWrite ? "schreiben (INSERT/UPDATE)" : null,
    caps.canDelete ? "löschen (DELETE)" : null,
  ].filter(Boolean);

  const placeholder = caps.canRead
    ? "SELECT * FROM characters ORDER BY name LIMIT 20"
    : caps.canWrite
      ? "UPDATE characters SET status = 'active' WHERE id = 1"
      : "DELETE FROM content_follows WHERE user_id = 0";

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Erlaubt für dich: {allowed.join(", ") || "—"}. Einzelne Anweisung, max.
        500 Zeilen, 5 Sekunden Timeout. SELECT/WITH laufen schreibgeschützt;
        Fremdschlüssel werden hier NICHT zu Slugs aufgelöst (rohe id).
      </p>
      <form action={formAction} className="flex flex-col gap-[12px]">
        <LcarsCodeEditor
          value={query}
          onChange={setQuery}
          language="sql"
          placeholder={placeholder}
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
        <p className="text-lcars-quinary" role="alert">
          {state.error}
        </p>
      )}

      {state.rows && state.columns && state.columns.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <p className="text-lcars-text-dim text-[13px]">
            {state.rows.length} Zeile(n)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-lcars-primary">
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
              <DbTableRows
                columns={state.columns}
                rows={state.rows}
                editContext={state.editContext}
                canEdit={caps.canWrite}
                canDelete={caps.canDelete}
              />
            </table>
          </div>
        </div>
      )}

      {/* write/delete ohne RETURNING: kein Spalten-Ergebnis, nur Kommando +
          betroffene Zeilenzahl. */}
      {state.rows &&
        state.columns &&
        state.columns.length === 0 &&
        !state.error && (
          <p className="text-lcars-senary text-[13px]">
            {state.command ?? "OK"} — {state.rowCount ?? 0} Zeile(n) betroffen.
          </p>
        )}
    </div>
  );
}

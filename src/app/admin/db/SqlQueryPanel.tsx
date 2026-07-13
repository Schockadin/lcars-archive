"use client";
import { useActionState, useRef, useState } from "react";
import DbTableRows from "./DbTableRows";
import { highlightSql } from "./sqlHighlight";
import { runAdminSqlQueryAction, type SqlQueryState } from "./sqlQueryActions";

const initialState: SqlQueryState = {};
const PLACEHOLDER = "SELECT * FROM characters ORDER BY name LIMIT 20";

// Freies, schreibgeschütztes SQL-Query-Feld für Admins — Ausführung läuft
// server-seitig über runAdminSqlQueryAction/runReadOnlyQuery (READ ONLY-
// Transaktion, siehe dbInspect.ts). Das Syntaxhighlighting ist die
// klassische "editierbares Textarea + farbige <pre> dahinter"-Technik: die
// Textarea bleibt unsichtbar (color: transparent), nur der Cursor ist
// sichtbar, das <pre> darunter zeigt den tokenisierten Text.
export default function SqlQueryPanel() {
  const [query, setQuery] = useState(PLACEHOLDER);
  const [state, formAction, pending] = useActionState(
    runAdminSqlQueryAction,
    initialState,
  );
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function syncScroll() {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <form action={formAction} className="flex flex-col gap-[12px]">
        <div className="sql-editor">
          <pre ref={preRef} className="sql-editor-highlight" aria-hidden="true">
            <code
              dangerouslySetInnerHTML={{ __html: `${highlightSql(query)}\n` }}
            />
          </pre>
          <textarea
            ref={textareaRef}
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            rows={6}
            className="sql-editor-textarea"
            placeholder={PLACEHOLDER}
            aria-label="SQL-Query"
          />
        </div>
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

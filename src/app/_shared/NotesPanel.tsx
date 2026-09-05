"use client";
import { useActionState, useState } from "react";
import { FormError } from "@/app/_shared/FormPrimitives";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import {
  addNoteAction,
  deleteNoteAction,
  type NoteActionState,
} from "@/app/actions/notes";
import {
  NOTE_MAX_LENGTH,
  type ContentNote,
  type NoteContentType,
} from "@/lib/contentNoteTypes";

const initialState: NoteActionState = {};

// Notizen und Kommentare an einem Inhalt. Zwei Bereiche in einem Panel:
//   „Meine Notizen"  — nur für einen selbst sichtbar
//   „Diskussion"     — für alle eingeloggten Personen
// Beides liegt in derselben Tabelle und unterscheidet sich nur über die
// Sichtbarkeit (siehe src/lib/contentNotes.ts).
//
// Wird nur für eingeloggte Personen gerendert (die Seite entscheidet das) —
// die Server Actions prüfen es zusätzlich selbst.
export default function NotesPanel({
  contentType,
  contentSlug,
  path,
  notes,
}: {
  contentType: NoteContentType;
  contentSlug: string;
  // Pfad für revalidatePath, damit die Liste nach dem Speichern frisch ist.
  path: string;
  notes: ContentNote[];
}) {
  const [state, formAction, pending] = useActionState(
    addNoteAction,
    initialState,
  );
  const [visibility, setVisibility] = useState<"private" | "group">("private");

  const own = notes.filter((n) => n.visibility === "private");
  const group = notes.filter((n) => n.visibility === "group");

  return (
    <SettingsPanel
      title="Notizen"
      hint="Persönliche Notizen und Kommentare für die Runde"
      badge={
        notes.length === 0
          ? "leer"
          : `${own.length} eigene · ${group.length} in der Runde`
      }
    >
      <NoteList title="Meine Notizen" notes={own} path={path} empty="Noch keine eigene Notiz." />
      <NoteList title="Diskussion" notes={group} path={path} empty="Noch keine Kommentare." />

      <form action={formAction} className="flex flex-col gap-[8px]">
        <input type="hidden" name="contentType" value={contentType} />
        <input type="hidden" name="contentSlug" value={contentSlug} />
        <input type="hidden" name="path" value={path} />
        <input type="hidden" name="visibility" value={visibility} />

        <textarea
          name="body"
          rows={3}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Notiz oder Kommentar…"
          className="lcars-input w-full"
          disabled={pending}
        />

        <div
          role="radiogroup"
          aria-label="Sichtbarkeit der Notiz"
          className="flex flex-wrap gap-[8px]"
        >
          {(
            [
              ["private", "Nur ich"],
              ["group", "Für die Runde"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-[var(--lcars-radius-pill)] border px-[14px] py-[4px] text-[12px] transition-colors ${
                visibility === value
                  ? "border-lcars-primary bg-lcars-surface-2"
                  : "border-lcars-border bg-lcars-surface"
              }`}
            >
              <input
                type="radio"
                name="visibility-choice"
                value={value}
                checked={visibility === value}
                onChange={() => setVisibility(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
          <button
            type="submit"
            disabled={pending}
            className="lcars-pill-btn--outline text-[12px] px-[14px] py-[4px] disabled:opacity-50"
          >
            {pending ? "Speichern…" : "Notiz speichern"}
          </button>
        </div>

        <FormError message={state.error} />
      </form>
    </SettingsPanel>
  );
}

function NoteList({
  title,
  notes,
  path,
  empty,
}: {
  title: string;
  notes: ContentNote[];
  path: string;
  empty: string;
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <h3 className="lcars-eyebrow text-lcars-ink-light !mt-0">{title}</h3>
      {notes.length === 0 ? (
        <p className="text-lcars-ink-dim text-[12px]">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-[8px]">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} path={path} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteItem({ note, path }: { note: ContentNote; path: string }) {
  const [state, formAction, pending] = useActionState(
    deleteNoteAction,
    initialState,
  );
  return (
    <li className="rounded-[8px] border border-lcars-border bg-lcars-surface px-[12px] py-[8px]">
      <p className="whitespace-pre-wrap text-[13px]">{note.body}</p>
      <div className="mt-[6px] flex flex-wrap items-center justify-between gap-[8px]">
        <span className="text-lcars-ink-dim font-lcars-mono text-[11px]">
          {note.authorName ?? "Unbekannt"} ·{" "}
          {new Date(note.createdAt).toLocaleDateString("de-DE")}
        </span>
        {note.canEdit && (
          <form action={formAction}>
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              disabled={pending}
              className="lcars-link-text text-lcars-quinary-ink text-[11px] disabled:opacity-50"
            >
              {pending ? "Löschen…" : "Löschen"}
            </button>
            <FormError message={state.error} />
          </form>
        )}
      </div>
    </li>
  );
}

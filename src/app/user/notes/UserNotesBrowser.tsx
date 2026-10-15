"use client";

import { useState } from "react";
import Link from "next/link";
import ModalOverlay from "@/components/ModalOverlay";
import { PencilIcon, TrashIcon } from "@/lib/icons";
import { NOTE_MAX_LENGTH } from "@/lib/contentNoteTypes";
import type { UserNote } from "@/lib/contentNotes";
import {
  deleteMyNoteAction,
  editMyNoteAction,
  getMyNotesAction,
} from "./actions";

export function noteExcerpt(body: string): string {
  const plain = body.replace(/\s+/g, " ").trim();
  return plain.length > 150 ? `${plain.slice(0, 150)}…` : plain;
}

export default function UserNotesBrowser({
  initialNotes,
}: {
  initialNotes: UserNote[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = notes.find((note) => note.id === selectedId) ?? null;

  function open(note: UserNote, edit = false) {
    setSelectedId(note.id);
    setDraft(note.body);
    setEditing(edit);
    setError("");
  }

  async function refresh() {
    setNotes(await getMyNotesAction());
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await editMyNoteAction(selected.id, draft);
      if (result.error) setError(result.error);
      else {
        await refresh();
        setEditing(false);
      }
    } catch {
      setError("Die Notiz konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(note: UserNote) {
    if (!window.confirm("Diese Notiz wirklich löschen?")) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteMyNoteAction(note.id);
      if (result.error) setError(result.error);
      else {
        await refresh();
        setSelectedId(null);
      }
    } catch {
      setError("Die Notiz konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  function actions(note: UserNote) {
    return note.canEdit ? (
      <div className="flex gap-[6px]">
        <button
          type="button"
          className="lcars-icon-btn size-[30px]"
          disabled={busy}
          aria-label={`Notiz zu „${note.targetLabel}“ bearbeiten`}
          title="Bearbeiten"
          onClick={(event) => {
            event.stopPropagation();
            open(note, true);
          }}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          className="lcars-icon-btn lcars-icon-btn--danger size-[30px]"
          disabled={busy}
          aria-label={`Notiz zu „${note.targetLabel}“ löschen`}
          title="Löschen"
          onClick={(event) => {
            event.stopPropagation();
            void remove(note);
          }}
        >
          <TrashIcon />
        </button>
      </div>
    ) : (
      <span className="text-lcars-ink-dim">Nur ansehen</span>
    );
  }

  return (
    <div className="lcars-text flex flex-col gap-[18px]">
      {error && !selected && (
        <p role="alert" className="text-lcars-quinary-ink">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lcars border border-lcars-border">
        <table className="w-full min-w-[650px] text-left text-[13px]">
          <thead className="bg-lcars-panel text-lcars-primary-ink">
            <tr>
              <th scope="col" className="p-[12px]">
                Notiz zu
              </th>
              <th scope="col" className="p-[12px]">
                Inhalt
              </th>
              <th scope="col" className="p-[12px]">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr
                key={note.id}
                tabIndex={0}
                aria-label={`Notiz zu „${note.targetLabel}“ anzeigen`}
                className="cursor-pointer border-t border-lcars-border hover:bg-lcars-panel focus-visible:outline-2 focus-visible:outline-lcars-primary"
                onClick={() => open(note)}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    open(note);
                  }
                }}
              >
                <td className="p-[12px]">
                  <Link
                    href={note.targetHref}
                    className="text-lcars-primary-ink underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {note.targetLabel}
                  </Link>
                </td>
                <td className="max-w-[600px] break-words p-[12px]">
                  {noteExcerpt(note.body)}
                </td>
                <td
                  className="p-[12px]"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actions(note)}
                </td>
              </tr>
            ))}
            {notes.length === 0 && (
              <tr>
                <td colSpan={3} className="p-[14px] text-lcars-ink-dim">
                  Noch keine Notizen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ModalOverlay
          title={`Notiz zu ${selected.targetLabel}`}
          onClose={() => setSelectedId(null)}
        >
          <Link
            href={selected.targetHref}
            className="text-lcars-primary-ink underline"
          >
            {selected.targetLabel}
          </Link>
          <p className="text-lcars-ink-dim text-[12px]">
            {selected.visibility === "private" ? "Nur ich" : "Für die Runde"} ·{" "}
            {selected.authorName ?? "Unbekannt"}
          </p>
          {editing ? (
            <form
              onSubmit={(event) => void save(event)}
              className="flex flex-col gap-[12px]"
            >
              <label htmlFor="note-edit-body">Inhalt</label>
              <textarea
                id="note-edit-body"
                className="lcars-input min-h-[220px]"
                value={draft}
                maxLength={NOTE_MAX_LENGTH}
                required
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                type="submit"
                className="lcars-pill-btn self-end"
                disabled={busy}
              >
                Speichern
              </button>
            </form>
          ) : (
            <div
              className="mission-body lcars-text"
              dangerouslySetInnerHTML={{ __html: selected.bodyHtml }}
            />
          )}
          {selected.canEdit && (
            <div className="flex gap-[6px]">
              <button
                type="button"
                className="lcars-icon-btn"
                disabled={busy}
                aria-label="Notiz bearbeiten"
                title="Bearbeiten"
                onClick={() => {
                  setDraft(selected.body);
                  setEditing(true);
                }}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="lcars-icon-btn lcars-icon-btn--danger"
                disabled={busy}
                aria-label="Notiz löschen"
                title="Löschen"
                onClick={() => void remove(selected)}
              >
                <TrashIcon />
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-lcars-quinary-ink">
              {error}
            </p>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

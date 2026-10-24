"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LcarsListFilterInput,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import ModalOverlay from "@/components/ModalOverlay";
import ChronoCard from "@/components/timeline/ChronoCard";
import ChronoRow from "@/components/timeline/ChronoRow";
import { EyeIcon, PencilIcon, TrashIcon } from "@/lib/icons";
import { NOTE_MAX_LENGTH } from "@/lib/contentNoteTypes";
import type { UserNote } from "@/lib/contentNotes";
import {
  deleteMyNoteAction,
  editMyNoteAction,
  getMyNotesAction,
} from "./actions";
import NewNoteButton from "./NewNoteButton";

export function noteExcerpt(body: string): string {
  const plain = body.replace(/\s+/g, " ").trim();
  return plain.length > 150 ? `${plain.slice(0, 150)}…` : plain;
}

type NoteFilter = "all" | "private" | "group";
type NoteSortKey = "date" | "target";

const NOTE_COLORS: Record<"private" | "group", string> = {
  private: "var(--lcars-primary)",
  group: "var(--lcars-secondary)",
};

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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [sortKey, setSortKey] = useState<NoteSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
          aria-label={`Notiz zu „${note.targetLabel}“ anzeigen`}
          title="Ansehen"
          onClick={() => open(note)}
        >
          <EyeIcon />
        </button>
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
      <button
        type="button"
        className="lcars-icon-btn size-[30px]"
        aria-label={`Notiz zu „${note.targetLabel}“ anzeigen`}
        title="Ansehen"
        onClick={() => open(note)}
      >
        <EyeIcon />
      </button>
    );
  }

  const needle = query.trim().toLocaleLowerCase("de");
  const shownNotes = [...notes]
    .filter((note) => filter === "all" || note.visibility === filter)
    .filter(
      (note) =>
        !needle ||
        `${note.targetLabel} ${note.body} ${note.authorName ?? ""}`
          .toLocaleLowerCase("de")
          .includes(needle),
    )
    .sort((a, b) => {
      const comparison =
        sortKey === "target"
          ? a.targetLabel.localeCompare(b.targetLabel, "de", {
              sensitivity: "base",
            })
          : a.createdAt.localeCompare(b.createdAt);
      return sortDir === "asc" ? comparison : -comparison;
    });

  return (
    <div className="lcars-text flex flex-col gap-[18px]">
      <div>
        <NewNoteButton onCreated={refresh} />
      </div>
      <div className="flex flex-wrap items-center gap-[12px]">
        <LcarsSortSwitch
          className="mission-sort"
          options={[
            { key: "date", label: "Datum", defaultDir: "desc" },
            { key: "target", label: "Eintrag" },
          ]}
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(key, direction) => {
            setSortKey(key as NoteSortKey);
            setSortDir(direction);
          }}
        />
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Notizen filtern"
        />
        <select
          className="mission-author-filter rounded-full"
          value={filter}
          onChange={(event) => setFilter(event.target.value as NoteFilter)}
          aria-label="Nach Notizart filtern"
        >
          <option value="all">Alle Notizen</option>
          <option value="private">Nur ich</option>
          <option value="group">Für die Runde</option>
        </select>
      </div>
      {error && !selected && (
        <p role="alert" className="text-lcars-quinary-ink">
          {error}
        </p>
      )}
      {shownNotes.length === 0 ? (
        <p className="lcars-empty-state">
          {notes.length === 0
            ? "Noch keine Notizen vorhanden."
            : "Keine Notizen für diesen Filter."}
        </p>
      ) : (
        <>
          <div className="archive-entry-list">
            {shownNotes.map((note) => (
              <ChronoRow
                key={note.id}
                date={note.createdAt}
                color={NOTE_COLORS[note.visibility]}
              >
                <div className="flex flex-1 flex-col gap-[8px] sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <ChronoCard
                      color={NOTE_COLORS[note.visibility]}
                      tag={
                        note.visibility === "private"
                          ? "Nur ich"
                          : "Für die Runde"
                      }
                      title={note.targetLabel}
                      href={note.targetHref ?? undefined}
                      summary={noteExcerpt(note.body)}
                      meta={note.authorName ?? "Unbekannt"}
                    />
                  </div>
                  {actions(note)}
                </div>
              </ChronoRow>
            ))}
          </div>
          <p className="lcars-eyebrow mt-[12px]">
            {shownNotes.length === notes.length
              ? `${notes.length} Notizen`
              : `${shownNotes.length} von ${notes.length} Notizen`}
          </p>
        </>
      )}

      {selected && (
        <ModalOverlay
          title={`Notiz zu ${selected.targetLabel}`}
          onClose={() => setSelectedId(null)}
        >
          {selected.targetHref ? (
            <Link
              href={selected.targetHref}
              className="text-lcars-primary-ink underline"
            >
              {selected.targetLabel}
            </Link>
          ) : (
            <span>{selected.targetLabel}</span>
          )}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalOverlay from "@/components/ModalOverlay";
import { NOTE_MAX_LENGTH, type NoteVisibility } from "@/lib/contentNoteTypes";
import type { NoteTarget } from "@/lib/contentNotes";
import { CONTENT_TYPES } from "@/lib/contentTypeFormat";
import { createMyNoteAction, getNoteTargetsAction } from "./actions";
import NoteTargetBrowser from "./NoteTargetBrowser";

export default function NewNoteButton({
  onCreated,
}: {
  onCreated?: () => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [targets, setTargets] = useState<NoteTarget[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetsError, setTargetsError] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [target, setTarget] = useState<NoteTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function begin() {
    setOpen(true);
    setError("");
  }

  async function openTargetBrowser() {
    setSelecting(true);
    setTargetsLoading(true);
    setTargetsError("");
    try {
      setTargets(await getNoteTargetsAction());
    } catch {
      setTargetsError("Die Einträge konnten nicht geladen werden.");
    } finally {
      setTargetsLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await createMyNoteAction({
        body,
        visibility,
        targetType: target?.type ?? null,
        targetSlug: target?.slug ?? null,
      });
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        setBody("");
        setTarget(null);
        setVisibility("private");
        await onCreated?.();
        router.refresh();
      }
    } catch {
      setError("Die Notiz konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="lcars-pill-btn" onClick={begin}>
        Neue Notiz
      </button>
      {open && selecting && (
        <ModalOverlay
          title="Inhalt auswählen"
          onClose={() => setSelecting(false)}
          width={900}
          tall
        >
          <NoteTargetBrowser
            targets={targets}
            loading={targetsLoading}
            error={targetsError}
            onSelect={(chosen) => {
              setTarget(chosen);
              setSelecting(false);
            }}
            onClear={() => {
              setTarget(null);
              setSelecting(false);
            }}
          />
        </ModalOverlay>
      )}
      {open && !selecting && (
        <ModalOverlay title="Neue Notiz" onClose={() => setOpen(false)}>
          <form
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-[12px]"
          >
            <div className="flex flex-col gap-[6px]">
              <span>Notiz zu (optional)</span>
              <div className="flex flex-wrap items-center gap-[8px]">
                <button
                  type="button"
                  className="lcars-pill-btn--outline"
                  onClick={() => void openTargetBrowser()}
                >
                  Inhalt auswählen
                </button>
                <span>
                  {target
                    ? `${target.label} (${CONTENT_TYPES[target.type === "archive" ? "archive_entry" : target.type].label})`
                    : "Ohne Eintrag"}
                </span>
                {target && (
                  <button
                    type="button"
                    className="text-lcars-primary-ink underline"
                    onClick={() => setTarget(null)}
                  >
                    Zuordnung entfernen
                  </button>
                )}
              </div>
            </div>
            <label className="flex flex-col gap-[6px]">
              Sichtbarkeit
              <select
                className="lcars-input"
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as NoteVisibility)
                }
              >
                <option value="private">Nur ich</option>
                <option value="group">Für die Runde</option>
              </select>
            </label>
            <label className="flex flex-col gap-[6px]">
              Inhalt
              <textarea
                className="lcars-input min-h-[220px]"
                required
                maxLength={NOTE_MAX_LENGTH}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-lcars-quinary-ink">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="lcars-pill-btn self-end"
              disabled={busy}
            >
              {busy ? "Speichern…" : "Notiz speichern"}
            </button>
          </form>
        </ModalOverlay>
      )}
    </>
  );
}

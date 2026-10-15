"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalOverlay from "@/components/ModalOverlay";
import { NOTE_MAX_LENGTH, type NoteVisibility } from "@/lib/contentNoteTypes";
import type { NoteTarget } from "@/lib/contentNotes";
import { createMyNoteAction, getNoteTargetsAction } from "./actions";

export default function NewNoteButton({
  onCreated,
}: {
  onCreated?: () => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<NoteTarget[]>([]);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function begin() {
    setOpen(true);
    setError("");
    try {
      setTargets(await getNoteTargetsAction());
    } catch {
      setError("Die Einträge konnten nicht geladen werden.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const chosen =
      targets.find((item) => `${item.type}:${item.slug}` === target) ?? null;
    try {
      const result = await createMyNoteAction({
        body,
        visibility,
        targetType: chosen?.type ?? null,
        targetSlug: chosen?.slug ?? null,
      });
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        setBody("");
        setTarget("");
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
      <button
        type="button"
        className="lcars-pill-btn"
        onClick={() => void begin()}
      >
        Neue Notiz
      </button>
      {open && (
        <ModalOverlay title="Neue Notiz" onClose={() => setOpen(false)}>
          <form
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-[12px]"
          >
            <label className="flex flex-col gap-[6px]">
              Notiz zu (optional)
              <select
                className="lcars-input"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="">Ohne Eintrag</option>
                {targets.map((item) => (
                  <option
                    key={`${item.type}:${item.slug}`}
                    value={`${item.type}:${item.slug}`}
                  >
                    {item.label} (
                    {item.type === "character"
                      ? "Charakter"
                      : item.type === "mission"
                        ? "Mission"
                        : item.type === "mission_log"
                          ? "Logbuch"
                          : "Datenbank"}
                    )
                  </option>
                ))}
              </select>
            </label>
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

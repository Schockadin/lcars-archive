"use client";
import { useActionState, useState } from "react";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  createPlannedSessionAction,
  deletePlannedSessionAction,
  updatePlannedSessionAction,
  type PlannedSessionState,
} from "@/app/actions/plannedSessions";
import { formatSessionMoment } from "@/lib/plannedSessionFormat";
import type { PlannedSession } from "@/lib/plannedSessionTypes";

// Die anstehenden Spieltermine — angekündigt von der Spielleitung, mit den
// Zu- und Absagen der Runde daneben.
//
// Getrennt von den gespielten Sessions darunter (SessionManager): dort werden
// AP gebucht, hier wird ein Termin angekündigt. Dieselbe Seite, weil beides
// „Sessions" sind und man von der Ankündigung direkt zur Nachbuchung geht.

function felder(session?: PlannedSession) {
  const at = session ? new Date(session.scheduledAt.replace(" ", "T")) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: at
      ? `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
      : "",
    time: at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : "19:30",
    title: session?.title ?? "",
    location: session?.location ?? "",
    notes: session?.notes ?? "",
  };
}

function SessionFields({ session }: { session?: PlannedSession }) {
  const v = felder(session);
  const id = session ? `p${session.id}` : "neu";
  return (
    <>
      <div className="flex flex-wrap gap-[12px]">
        <FormField label="Datum" htmlFor={`ps-date-${id}`} className="flex-1">
          <input
            id={`ps-date-${id}`}
            type="date"
            name="date"
            required
            defaultValue={v.date}
            className="lcars-input"
          />
        </FormField>
        <FormField label="Uhrzeit" htmlFor={`ps-time-${id}`} className="flex-1">
          <input
            id={`ps-time-${id}`}
            type="time"
            name="time"
            required
            defaultValue={v.time}
            className="lcars-input"
          />
        </FormField>
      </div>
      <FormField
        label="Titel (optional)"
        htmlFor={`ps-title-${id}`}
        hint="z.B. „Fortsetzung Nebel von Ceti“"
      >
        <input
          id={`ps-title-${id}`}
          type="text"
          name="title"
          defaultValue={v.title}
          maxLength={200}
          className="lcars-input"
        />
      </FormField>
      <FormField label="Ort (optional)" htmlFor={`ps-loc-${id}`}>
        <input
          id={`ps-loc-${id}`}
          type="text"
          name="location"
          defaultValue={v.location}
          maxLength={200}
          className="lcars-input"
        />
      </FormField>
      <FormField label="Notiz (optional)" htmlFor={`ps-notes-${id}`}>
        <textarea
          id={`ps-notes-${id}`}
          name="notes"
          rows={2}
          defaultValue={v.notes}
          maxLength={2000}
          className="lcars-input"
        />
      </FormField>
    </>
  );
}

function PlannedSessionRow({ session }: { session: PlannedSession }) {
  const [edit, setEdit] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState<
    PlannedSessionState,
    FormData
  >(updatePlannedSessionAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState<
    PlannedSessionState,
    FormData
  >(deletePlannedSessionAction, {});

  const zusagen = session.rsvps.filter((r) => r.response === "yes");
  const absagen = session.rsvps.filter((r) => r.response === "no");

  return (
    <li className="flex flex-col gap-[6px] border-b border-lcars-border pb-[10px]">
      <div className="flex flex-wrap items-start gap-[10px]">
        <span className="flex-1 min-w-[220px] flex flex-col">
          <strong className="text-lcars-ink-data">
            {formatSessionMoment(session.scheduledAt)}
          </strong>
          {session.title && <span>{session.title}</span>}
          <span className="text-lcars-ink-dim text-[12px]">
            {session.location && `${session.location} · `}
            {zusagen.length} zugesagt
            {absagen.length > 0 && `, ${absagen.length} abgesagt`}
          </span>
          {zusagen.length > 0 && (
            <span className="text-lcars-ink text-[13px]">
              Dabei: {zusagen.map((r) => r.userName).join(", ")}
            </span>
          )}
          {absagen.length > 0 && (
            <span className="text-lcars-ink-dim text-[13px]">
              Abgesagt: {absagen.map((r) => r.userName).join(", ")}
            </span>
          )}
        </span>
        <div className="flex gap-[6px]">
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={() => setEdit((o) => !o)}
          >
            {edit ? "Abbrechen" : "Ändern"}
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={session.id} />
            <SubmitButton
              pending={deletePending}
              pendingLabel="Entfernt…"
              className="lcars-pill-btn--outline disabled:opacity-50"
              onClick={confirmSubmit("Diesen Termin entfernen?")}
            >
              Entfernen
            </SubmitButton>
          </form>
        </div>
      </div>

      {edit && (
        <form action={updateAction} className="flex flex-col">
          <input type="hidden" name="id" value={session.id} />
          <SessionFields session={session} />
          <SubmitButton pending={updatePending} pendingLabel="Speichert…">
            Speichern
          </SubmitButton>
        </form>
      )}
      <FormError message={updateState.error ?? deleteState.error} />
    </li>
  );
}

export default function PlannedSessionManager({
  sessions,
}: {
  sessions: PlannedSession[];
}) {
  const [state, formAction, pending] = useActionState<
    PlannedSessionState,
    FormData
  >(createPlannedSessionAction, {});
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-[24px]">
      <h2>Anstehende Spieltermine</h2>
      <p className="text-lcars-ink-dim text-[13px] mb-[10px]">
        Angekündigte Termine stehen allen Angemeldeten auf der Startseite, mit
        Zu- und Absage. Gespielt und abgerechnet wird darunter.
      </p>

      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="lcars-eyebrow cursor-pointer mb-[8px]">
          Termin ankündigen
        </summary>
        <form
          action={(data) => {
            formAction(data);
            setOpen(false);
          }}
          className="flex flex-col mb-[12px]"
        >
          <SessionFields />
          <SubmitButton pending={pending} pendingLabel="Wird angekündigt…">
            Ankündigen
          </SubmitButton>
        </form>
      </details>
      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}

      {sessions.length === 0 ? (
        <p className="lcars-empty-state">Kein Termin angekündigt.</p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {sessions.map((s) => (
            <PlannedSessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

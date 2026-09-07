"use client";
import { useActionState, useState } from "react";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import ModalOverlay from "@/components/ModalOverlay";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  createPlannedSessionAction,
  deletePlannedSessionAction,
  updatePlannedSessionAction,
  type PlannedSessionState,
} from "@/app/actions/plannedSessions";
import {
  recordPlannedSessionAction,
  type SessionFormState,
} from "./actions";
import {
  formatSessionMoment,
  toDateTimeLocal,
} from "@/lib/plannedSessionFormat";
import type { PlannedSession } from "@/lib/plannedSessionTypes";
import type { ActiveCharacter } from "@/lib/gameSessions";

// Die anstehenden Spieltermine — angekündigt von der Spielleitung, mit den
// Zu- und Absagen der Runde daneben.
//
// Getrennt von den nachgetragenen Sessions darunter (SessionManager): dort
// werden AP gebucht, hier wird ein Termin angekündigt. Beides steht auf einer
// Seite, weil aus dem Termin am Ende genau diese Nachbuchung wird — der Knopf
// „Session eintragen" an einem Termin geht diesen Weg in einem Schritt.

// Wer mitspielt: alle aktiven Figuren mit Konto, vorausgewählt. Dieselbe
// Auswahl beim Ankündigen (wer eingeplant ist) und beim Eintragen (wer AP
// bekommt) — ein Abend, eine Besetzung.
function CharacterChecklist({
  characters,
  selected,
  legend,
}: {
  characters: ActiveCharacter[];
  // null = alle vorausgewählt (neuer Termin).
  selected: number[] | null;
  legend: string;
}) {
  return (
    <fieldset className="flex flex-col gap-[6px]">
      <legend className="lcars-eyebrow">{legend}</legend>
      {characters.length === 0 ? (
        <p className="lcars-empty-state">
          Keine aktiven Charaktere mit verknüpftem Konto.
        </p>
      ) : (
        <div className="flex flex-wrap gap-[12px]">
          {characters.map((character) => (
            <label key={character.id} className="flex items-center gap-[6px]">
              <input
                type="checkbox"
                name="characterIds"
                value={character.id}
                defaultChecked={
                  selected === null ? true : selected.includes(character.id)
                }
              />
              <span>
                {character.name}
                {character.playerName && (
                  <span className="text-lcars-ink-dim text-[12px]">
                    {" "}
                    · {character.playerName}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

// Die Felder eines Termins. Zeitpunkt als EIN datetime-local-Feld: Datum und
// Uhrzeit gehören zusammen, und der native Picker bringt beides mit.
function SessionFields({
  session,
  characters,
}: {
  session?: PlannedSession;
  characters: ActiveCharacter[];
}) {
  const id = session ? `p${session.id}` : "neu";
  return (
    <>
      <FormField label="Zeitpunkt" htmlFor={`ps-at-${id}`}>
        <input
          id={`ps-at-${id}`}
          type="datetime-local"
          name="scheduledAt"
          required
          defaultValue={
            session ? toDateTimeLocal(session.scheduledAt) : defaultMoment()
          }
          className="lcars-input"
        />
      </FormField>
      <FormField
        label="Titel (optional)"
        htmlFor={`ps-title-${id}`}
        hint="z.B. „Fortsetzung Nebel von Ceti“"
      >
        <input
          id={`ps-title-${id}`}
          type="text"
          name="title"
          defaultValue={session?.title ?? ""}
          maxLength={200}
          className="lcars-input"
        />
      </FormField>
      <FormField label="Ort (optional)" htmlFor={`ps-loc-${id}`}>
        <input
          id={`ps-loc-${id}`}
          type="text"
          name="location"
          defaultValue={session?.location ?? ""}
          maxLength={200}
          className="lcars-input"
        />
      </FormField>
      <FormField label="Notiz (optional)" htmlFor={`ps-notes-${id}`}>
        <textarea
          id={`ps-notes-${id}`}
          name="notes"
          rows={2}
          defaultValue={session?.notes ?? ""}
          maxLength={2000}
          className="lcars-input"
        />
      </FormField>
      <CharacterChecklist
        characters={characters}
        selected={session ? session.characterIds : null}
        legend="Wer spielt mit"
      />
    </>
  );
}

// Vorbelegung für einen neuen Termin: der nächste Tag, 19:30. Nur im Browser
// gebildet — das Fenster wird erst durch einen Klick gerendert, ein
// Server-Render mit abweichender Uhr gibt es also nicht.
function defaultMoment(): string {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T19:30`;
}

// Aus dem Termin wird die gespielte Session: Zeitpunkt, Titel und Besetzung
// stehen schon, hier kommen AP und Notizen dazu.
function RecordSessionModal({
  session,
  characters,
  defaultSessionAp,
  onClose,
}: {
  session: PlannedSession;
  characters: ActiveCharacter[];
  defaultSessionAp: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    SessionFormState,
    FormData
  >(recordPlannedSessionAction, {});

  // Nach dem Buchen schließt sich das Fenster nicht von selbst: der Erfolgstext
  // („je 3 AP an 4 Charaktere gebucht") ist die Quittung.
  return (
    <ModalOverlay title="Session eintragen" onClose={onClose} width={720}>
      <p className="text-lcars-ink-dim text-[13px]">
        {formatSessionMoment(session.scheduledAt)}
        {session.title && ` · ${session.title}`}
      </p>
      <form action={formAction} className="flex flex-col gap-[12px]">
        <input type="hidden" name="plannedId" value={session.id} />
        <input
          type="hidden"
          name="sessionDate"
          value={session.scheduledAt.slice(0, 10)}
        />
        <input type="hidden" name="title" value={session.title} />
        <div className="flex flex-wrap items-end gap-[8px]">
          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">Session-AP</span>
            <input
              name="sessionAp"
              type="number"
              min={0}
              defaultValue={defaultSessionAp}
              className="lcars-input rounded-full w-[100px] text-right"
            />
          </label>
          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">Bonus-AP</span>
            <input
              name="bonusAp"
              type="number"
              min={0}
              defaultValue={0}
              className="lcars-input rounded-full w-[100px] text-right"
            />
          </label>
        </div>

        <CharacterChecklist
          characters={characters}
          // Wer eingeplant war, bekommt die AP — wer doch gefehlt hat, wird
          // hier abgewählt. Ein Termin ohne Besetzung (aus der Zeit vor dieser
          // Auswahl) fällt auf „alle aktiven" zurück.
          selected={
            session.characterIds.length > 0 ? session.characterIds : null
          }
          legend="Gutschreiben an"
        />

        <div className="flex flex-col gap-[4px]">
          <label
            htmlFor={`record-notes-${session.id}`}
            className="lcars-eyebrow"
          >
            Notizen (optional)
          </label>
          <MarkdownEditor
            id={`record-notes-${session.id}`}
            name="notes"
            rows={8}
            defaultValue={session.notes}
          />
        </div>

        <SubmitButton pending={pending} pendingLabel="Wird gebucht…">
          Session eintragen
        </SubmitButton>
        <FormError message={state.error} />
        {state.success && <FormSuccess>{state.success}</FormSuccess>}
      </form>
    </ModalOverlay>
  );
}

function PlannedSessionRow({
  session,
  characters,
  defaultSessionAp,
}: {
  session: PlannedSession;
  characters: ActiveCharacter[];
  defaultSessionAp: number;
}) {
  const [edit, setEdit] = useState(false);
  const [record, setRecord] = useState(false);
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
  const erledigt = session.gameSessionId !== null;

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
            {session.characterIds.length > 0 &&
              ` · ${session.characterIds.length} eingeplant`}
            {erledigt && " · eingetragen"}
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
          {!erledigt && (
            <button
              type="button"
              className="lcars-pill-btn--outline"
              onClick={() => setRecord(true)}
            >
              Session eintragen
            </button>
          )}
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
          <SessionFields session={session} characters={characters} />
          <SubmitButton pending={updatePending} pendingLabel="Speichert…">
            Speichern
          </SubmitButton>
        </form>
      )}
      {record && (
        <RecordSessionModal
          session={session}
          characters={characters}
          defaultSessionAp={defaultSessionAp}
          onClose={() => setRecord(false)}
        />
      )}
      <FormError message={updateState.error ?? deleteState.error} />
    </li>
  );
}

export default function PlannedSessionManager({
  sessions,
  characters,
  defaultSessionAp,
}: {
  sessions: PlannedSession[];
  characters: ActiveCharacter[];
  defaultSessionAp: number;
}) {
  const [state, formAction, pending] = useActionState<
    PlannedSessionState,
    FormData
  >(createPlannedSessionAction, {});
  const [announce, setAnnounce] = useState(false);

  return (
    <section className="mb-[24px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <h2>Anstehende Spieltermine</h2>
        <button
          type="button"
          className="lcars-pill-btn--outline"
          onClick={() => setAnnounce(true)}
        >
          Termin ankündigen
        </button>
      </div>
      <p className="text-lcars-ink-dim text-[13px] mb-[10px]">
        Angekündigte Termine stehen allen Angemeldeten auf der Startseite, mit
        Zu- und Absage. Ist der Abend gespielt, macht &bdquo;Session
        eintragen&ldquo; daraus die Nachbuchung mit AP.
      </p>

      {announce && (
        <ModalOverlay
          title="Termin ankündigen"
          onClose={() => setAnnounce(false)}
          width={720}
        >
          <form
            action={(data) => {
              formAction(data);
              setAnnounce(false);
            }}
            className="flex flex-col"
          >
            <SessionFields characters={characters} />
            <SubmitButton pending={pending} pendingLabel="Wird angekündigt…">
              Ankündigen
            </SubmitButton>
          </form>
        </ModalOverlay>
      )}
      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}

      {sessions.length === 0 ? (
        <p className="lcars-empty-state">Kein Termin angekündigt.</p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {sessions.map((s) => (
            <PlannedSessionRow
              key={s.id}
              session={s}
              characters={characters}
              defaultSessionAp={defaultSessionAp}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

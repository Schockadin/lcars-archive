"use client";
import { useActionState, useState } from "react";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import ModalOverlay from "@/components/ModalOverlay";
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
import type { SessionMissionOption } from "@/lib/gameSessions";
import type { GameSession } from "@/lib/gameSessions";
import type { CharacterParticipantOption } from "@/lib/characters";
import { SessionContextFields } from "./SessionManager";
import { CheckIcon, PencilIcon, TrashIcon, XIcon } from "@/lib/icons";

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
  missions,
  missionCharacters,
  defaultMissionStartedAt,
}: {
  session?: PlannedSession;
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
  missionCharacters: CharacterParticipantOption[];
  defaultMissionStartedAt: string | null;
}) {
  const id = session ? `p${session.id}` : "neu";
  const [missionChoice, setMissionChoice] = useState(String(session?.missionId ?? ""));
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
      <FormField label="Mission" htmlFor={`ps-mission-${id}`}>
        {session?.gameSessionId !== null && session?.missionId ? (
          <>
            <input type="hidden" name="missionId" value={session.missionId} />
            <span className="lcars-input rounded-full">
              {session.missionTitle ?? session.title}
            </span>
          </>
        ) : (
          <select
            id={`ps-mission-${id}`}
            name="missionId"
            required
            value={missionChoice}
            onChange={(event) => setMissionChoice(event.target.value)}
            className="lcars-input rounded-full"
          >
            <option value="" disabled>Mission auswählen</option>
            {session?.missionId && !missions.some((mission) => mission.id === session.missionId) && (
              <option value={session.missionId}>{session.missionTitle ?? session.title} (nicht mehr laufend)</option>
            )}
            {missions.map((mission) => (
              <option key={mission.id} value={mission.id}>{mission.title}</option>
            ))}
            {!session && <option value="new">Neue Mission hinzufügen</option>}
          </select>
        )}
      </FormField>
      {!session && missionChoice === "new" && (
        <fieldset className="flex flex-col gap-[8px] rounded-lg border border-lcars-border p-[10px]">
          <legend className="lcars-eyebrow px-[4px]">Neue Mission</legend>
          <FormField label="Titel" htmlFor={`ps-new-title-${id}`}>
            <input id={`ps-new-title-${id}`} name="missionTitle" required maxLength={200} className="lcars-input rounded-full" />
          </FormField>
          <FormField label="Slug (optional)" htmlFor={`ps-new-slug-${id}`}>
            <input id={`ps-new-slug-${id}`} name="missionSlug" maxLength={200} className="lcars-input rounded-full" />
          </FormField>
          <div className="flex flex-wrap gap-[8px]">
            <FormField label="Start" htmlFor={`ps-new-start-${id}`}>
              <input id={`ps-new-start-${id}`} type="date" name="missionStartedAt" defaultValue={defaultMissionStartedAt ?? ""} className="lcars-input rounded-full" />
            </FormField>
            <FormField label="Ende (optional)" htmlFor={`ps-new-end-${id}`}>
              <input id={`ps-new-end-${id}`} type="date" name="missionEndedAt" className="lcars-input rounded-full" />
            </FormField>
          </div>
          <FormField label="Tags (kommagetrennt)" htmlFor={`ps-new-tags-${id}`}>
            <input id={`ps-new-tags-${id}`} name="missionTags" className="lcars-input rounded-full" />
          </FormField>
          <FormField label="Teaser (optional)" htmlFor={`ps-new-teaser-${id}`}>
            <textarea id={`ps-new-teaser-${id}`} name="missionTeaser" rows={2} maxLength={1000} className="lcars-input rounded-lg" />
          </FormField>
          <FormField label="Teilnehmende Charaktere" htmlFor={`ps-new-participants-${id}`} hint="Mehrfachauswahl mit Strg/Cmd- oder Shift-Klick.">
            {missionCharacters.length > 0 ? (
              <select id={`ps-new-participants-${id}`} name="participantCharacterIds" multiple size={Math.min(8, missionCharacters.length)} className="lcars-input rounded-lg h-auto py-[8px]">
                {missionCharacters.filter((character) => character.status === "active").map((character) => (
                  <option key={character.id} value={character.id}>{character.name} ({character.playerName})</option>
                ))}
              </select>
            ) : <p className="lcars-empty-state">Keine Charaktere zur Auswahl.</p>}
          </FormField>
          <p className="text-lcars-ink-dim text-[12px]">Die Mission wird als laufend angelegt. Ihre Synopsis entsteht automatisch aus den später eingetragenen Session-Blöcken.</p>
        </fieldset>
      )}
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

// Aus dem Termin wird die gespielte Session: Zeitpunkt, Mission und Besetzung
// stehen schon, hier kommen AP und optionale Synopsisblöcke dazu.
function RecordSessionModal({
  session,
  characters,
  missions,
  playedSessions,
  defaultSessionAp,
  onClose,
}: {
  session: PlannedSession;
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
  playedSessions: GameSession[];
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
      <form action={formAction} className="flex flex-col gap-[12px]" data-no-draft>
        <input type="hidden" name="plannedId" value={session.id} />
        <input
          type="hidden"
          name="sessionDate"
          value={session.scheduledAt.slice(0, 10)}
        />
        <SessionContextFields
          missions={missions}
          idPrefix={`record-session-${session.id}`}
          initialMissionId={session.missionId}
          lockedMission={session.missionId !== null}
          sessionHistory={playedSessions}
          beforeSessionNumber={session.missionSessionNumber}
        />
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

        <SubmitButton pending={pending} pendingLabel="Wird gebucht…" className="lcars-icon-btn" ariaLabel="Session eintragen" title="Session eintragen">
          <CheckIcon />
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
  missions,
  recordMissions,
  playedSessions,
  missionCharacters,
  defaultSessionAp,
  defaultMissionStartedAt,
}: {
  session: PlannedSession;
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
  recordMissions: SessionMissionOption[];
  playedSessions: GameSession[];
  missionCharacters: CharacterParticipantOption[];
  defaultSessionAp: number;
  defaultMissionStartedAt: string | null;
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
    <li id={`planned-session-${session.id}`} className="scroll-mt-24 flex flex-col gap-[6px] border-b border-lcars-border pb-[10px]">
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
              className="lcars-icon-btn"
              aria-label="Session eintragen"
              title="Session eintragen"
              onClick={() => setRecord(true)}
            ><CheckIcon />
            </button>
          )}
          <button
            type="button"
            className="lcars-icon-btn"
            aria-label={edit ? "Bearbeitung abbrechen" : "Termin ändern"}
            title={edit ? "Bearbeitung abbrechen" : "Termin ändern"}
            onClick={() => setEdit((o) => !o)}
          >
            {edit ? <XIcon /> : <PencilIcon />}
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={session.id} />
            <SubmitButton
              pending={deletePending}
              pendingLabel="Entfernt…"
              className="lcars-icon-btn lcars-icon-btn--danger disabled:opacity-50"
              ariaLabel="Termin entfernen"
              title="Termin entfernen"
              onClick={confirmSubmit("Diesen Termin entfernen?")}
            ><TrashIcon /></SubmitButton>
          </form>
        </div>
      </div>

      {edit && (
        <form action={updateAction} className="flex flex-col" data-no-draft>
          <input type="hidden" name="id" value={session.id} />
          <SessionFields session={session} characters={characters} missions={missions} missionCharacters={missionCharacters} defaultMissionStartedAt={defaultMissionStartedAt} />
          <SubmitButton pending={updatePending} pendingLabel="Speichert…" className="lcars-icon-btn" ariaLabel="Termin speichern" title="Termin speichern">
            <CheckIcon />
          </SubmitButton>
        </form>
      )}
      {record && (
        <RecordSessionModal
          session={session}
          characters={characters}
          missions={recordMissions}
          playedSessions={playedSessions}
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
  missions,
  recordMissions,
  playedSessions = [],
  missionCharacters,
  defaultSessionAp,
  defaultMissionStartedAt,
  showCreateForm = true,
}: {
  sessions: PlannedSession[];
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
  recordMissions: SessionMissionOption[];
  playedSessions?: GameSession[];
  missionCharacters: CharacterParticipantOption[];
  defaultSessionAp: number;
  defaultMissionStartedAt: string | null;
  showCreateForm?: boolean;
}) {
  const [announce, setAnnounce] = useState(false);

  return (
    <section className="mb-[24px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <h2>Anstehende Spieltermine</h2>
        {showCreateForm && (
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={() => setAnnounce(true)}
          >Termin planen</button>
        )}
      </div>
      {showCreateForm && (
        <p className="text-lcars-ink-dim text-[13px] mb-[10px]">
          Angekündigte Termine stehen allen Angemeldeten auf der Startseite, mit
          Zu- und Absage. Ist der Abend gespielt, macht &bdquo;Session
          eintragen&ldquo; daraus die Nachbuchung mit AP.
        </p>
      )}

      {showCreateForm && announce && (
        <CreatePlannedSessionModal
          characters={characters}
          missions={missions}
          missionCharacters={missionCharacters}
          defaultMissionStartedAt={defaultMissionStartedAt}
          onClose={() => setAnnounce(false)}
        />
      )}

      {sessions.length === 0 ? (
        <p className="lcars-empty-state">Kein Termin angekündigt.</p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {sessions.map((s) => (
            <PlannedSessionRow
              key={s.id}
              session={s}
              characters={characters}
              missions={missions}
              recordMissions={recordMissions}
              playedSessions={playedSessions}
              missionCharacters={missionCharacters}
              defaultSessionAp={defaultSessionAp}
              defaultMissionStartedAt={defaultMissionStartedAt}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CreatePlannedSessionModal({
  characters,
  missions,
  missionCharacters,
  defaultMissionStartedAt,
  onClose,
}: {
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
  missionCharacters: CharacterParticipantOption[];
  defaultMissionStartedAt: string | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<PlannedSessionState, FormData>(
    createPlannedSessionAction,
    {},
  );
  return (
    <ModalOverlay title="Session planen" onClose={onClose} width={720}>
      {state.success ? (
        <div className="flex flex-col gap-[12px]">
          <FormSuccess>{state.success}</FormSuccess>
          <button type="button" className="lcars-pill-btn--outline self-start" onClick={onClose}>Schließen</button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-[12px]" data-no-draft>
          <SessionFields characters={characters} missions={missions} missionCharacters={missionCharacters} defaultMissionStartedAt={defaultMissionStartedAt} />
          <SubmitButton pending={pending} pendingLabel="Wird geplant…" className="lcars-pill-btn--outline">Session planen</SubmitButton>
          <FormError message={state.error} />
        </form>
      )}
    </ModalOverlay>
  );
}

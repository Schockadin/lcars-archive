"use client";
import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import { formatISODate } from "@/utils/formateISODate";
import type {
  GameSession,
  ActiveCharacter,
  SessionLogbook,
} from "@/lib/gameSessions";
import {
  createSessionAction,
  deleteSessionAction,
  updateSessionAction,
  setSessionLogbooksAction,
  type SessionFormState,
} from "./actions";

const initialState: SessionFormState = {};

// Anlegen: Datum, Titel, AP-Beträge, Teilnehmende und Notizen. Die
// Teilnehmenden sind vorausgewählt — die Regel lautet „alle aktiven
// Charaktere", wer gefehlt hat, wird abgewählt.
function NewSessionForm({
  characters,
  defaultSessionAp,
  today,
}: {
  characters: ActiveCharacter[];
  defaultSessionAp: number;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    createSessionAction,
    initialState,
  );

  return (
    // key auf dem Erfolgstext: nach dem Anlegen soll das Formular wieder
    // leer/vorbelegt dastehen — ein neuer key wirft es samt defaultValues neu.
    <form
      key={state.success ?? "new"}
      action={formAction}
      className="flex flex-col gap-[12px]"
    >
      <div className="flex flex-wrap items-end gap-[8px]">
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Datum</span>
          <input
            name="sessionDate"
            type="date"
            required
            defaultValue={today}
            className="lcars-input rounded-full"
          />
        </label>
        <label className="flex flex-col gap-[4px] flex-1 min-w-[200px]">
          <span className="lcars-eyebrow">Titel (optional)</span>
          <input
            name="title"
            type="text"
            placeholder="z.B. Der Nebel von Cygnus IV"
            className="lcars-input rounded-full w-full"
          />
        </label>
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

      <fieldset className="flex flex-col gap-[6px]">
        <legend className="lcars-eyebrow">Gutschreiben an</legend>
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
                  defaultChecked
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

      <label className="flex flex-col gap-[4px]">
        <span className="lcars-eyebrow">Notizen (optional)</span>
        <textarea
          name="notes"
          rows={10}
          className="lcars-input h-auto w-full"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Session eintragen
      </button>

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </form>
  );
}

// Logbücher einer Session zuordnen. Angeboten werden die bereits zugeordneten
// und alle noch freien — ein Logbuch gehört zu höchstens einer Session.
function SessionLogbookForm({
  session,
  logbooks,
  apPerLogbook,
}: {
  session: GameSession;
  logbooks: SessionLogbook[];
  apPerLogbook: number;
}) {
  const [state, formAction, pending] = useActionState(
    setSessionLogbooksAction,
    initialState,
  );

  const own = logbooks.filter((log) => log.sessionId === session.id);
  const free = logbooks.filter((log) => log.sessionId === null);

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="id" value={session.id} />
      <fieldset className="flex flex-col gap-[6px]">
        <legend className="lcars-eyebrow">Logbücher zu dieser Session</legend>
        <p className="text-lcars-ink-dim text-[12px]">
          Sobald mindestens ein Logbuch verknüpft ist, bekommen alle
          Teilnehmenden automatisch {apPerLogbook} AP extra — einmal je Session,
          egal wie viele Logbücher geschrieben werden.
        </p>
        {own.length + free.length === 0 ? (
          <p className="lcars-empty-state">Keine Logbücher zur Auswahl.</p>
        ) : (
          <div className="flex flex-col gap-[4px]">
            {[...own, ...free].map((log) => (
              <label key={log.id} className="flex items-center gap-[6px]">
                <input
                  type="checkbox"
                  name="logIds"
                  value={log.id}
                  defaultChecked={log.sessionId === session.id}
                />
                <span>
                  {log.title}
                  <span className="text-lcars-ink-dim text-[12px]">
                    {" "}
                    · {log.missionTitle}
                    {log.authorName && ` · ${log.authorName}`}
                    {log.logDate && ` · ${formatISODate(log.logDate)}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Logbücher übernehmen
      </button>

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </form>
  );
}

function SessionRow({
  session,
  characters,
  logbooks,
  apPerLogbook,
}: {
  session: GameSession;
  // Auswahl für „Gutschreiben an" — dieselbe Liste wie beim Anlegen.
  characters: ActiveCharacter[];
  logbooks: SessionLogbook[];
  apPerLogbook: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateSessionAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSessionAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-[var(--lcars-ink-dim)]/30 pb-[8px]">
      <button
        type="button"
        className="flex flex-wrap items-baseline gap-[8px] text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lcars-eyebrow">
          {formatISODate(session.sessionDate)}
        </span>
        <span className="flex-1 min-w-[180px]">
          {session.title || "Ohne Titel"}
        </span>
        <span className="stat-ap-amount">
          {session.sessionAp}
          {session.bonusAp > 0 && ` + ${session.bonusAp}`} AP
        </span>
        <span className="text-lcars-ink-dim text-[13px]">
          {session.characterCount} Charaktere · {session.totalAp} AP gesamt ·{" "}
          {session.logbookCount} Logbücher
        </span>
      </button>

      {open && (
        <>
          <form action={formAction} className="flex flex-col gap-[8px]">
            <input type="hidden" name="id" value={session.id} />
            <div className="flex flex-wrap items-end gap-[8px]">
              <label className="flex flex-col gap-[4px]">
                <span className="lcars-eyebrow">Datum</span>
                <input
                  name="sessionDate"
                  type="date"
                  required
                  defaultValue={session.sessionDate.slice(0, 10)}
                  className="lcars-input rounded-full"
                />
              </label>
              <label className="flex min-w-[200px] flex-1 flex-col gap-[4px]">
                <span className="lcars-eyebrow">Titel</span>
                <input
                  name="title"
                  type="text"
                  defaultValue={session.title}
                  className="lcars-input rounded-full w-full"
                />
              </label>
              <label className="flex flex-col gap-[4px]">
                <span className="lcars-eyebrow">Session-AP</span>
                <input
                  name="sessionAp"
                  type="number"
                  min={0}
                  defaultValue={session.sessionAp}
                  className="lcars-input rounded-full w-[100px] text-right"
                />
              </label>
              <label className="flex flex-col gap-[4px]">
                <span className="lcars-eyebrow">Bonus-AP</span>
                <input
                  name="bonusAp"
                  type="number"
                  min={0}
                  defaultValue={session.bonusAp}
                  className="lcars-input rounded-full w-[100px] text-right"
                />
              </label>
            </div>

            <fieldset className="flex flex-col gap-[6px]">
              <legend className="lcars-eyebrow">Gutschreiben an</legend>
              {characters.length === 0 ? (
                <p className="lcars-empty-state">
                  Keine aktiven Charaktere mit verknüpftem Konto.
                </p>
              ) : (
                <div className="flex flex-wrap gap-[12px]">
                  {characters.map((character) => (
                    <label
                      key={character.id}
                      className="flex items-center gap-[6px]"
                    >
                      <input
                        type="checkbox"
                        name="characterIds"
                        value={character.id}
                        defaultChecked={session.characterIds.includes(
                          character.id,
                        )}
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

            <label className="flex flex-col gap-[4px]">
              <span className="lcars-eyebrow">Notizen</span>
              <textarea
                name="notes"
                rows={10}
                defaultValue={session.notes}
                className="lcars-input h-auto w-full"
              />
            </label>
            <p className="text-lcars-ink-dim text-[12px]">
              Eingetragen von {session.createdByName ?? "unbekannt"}. Beim
              Speichern werden die Gutschriften dieser Session neu gebucht:
              geänderte Beträge und Teilnehmende schlagen also unmittelbar auf
              die Konten durch. Bereits ausgegebene AP holt das nicht zurück —
              ein Konto kann dadurch rechnerisch ins Minus laufen und ist dann
              unter „Kampagne“ mit einer Korrekturbuchung geradezuziehen.
            </p>
            <div className="flex flex-wrap gap-[8px]">
              <button
                type="submit"
                disabled={pending}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>

          <SessionLogbookForm
            session={session}
            logbooks={logbooks}
            apPerLogbook={apPerLogbook}
          />

          <form action={deleteAction}>
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              disabled={deletePending}
              onClick={confirmSubmit(
                "Session zurücknehmen? Die Gutschriften dieser Session werden storniert — bereits ausgegebene AP kommen dadurch nicht zurück.",
              )}
              className="lcars-pill-btn--outline disabled:opacity-50"
            >
              Session zurücknehmen
            </button>
          </form>
        </>
      )}

      {!open && session.notes && (
        <p className="text-lcars-ink-dim text-[13px] line-clamp-2">
          {session.notes}
        </p>
      )}

      <FormError message={state.error ?? deleteState.error} />
      {(state.success ?? deleteState.success) && (
        <FormSuccess>{state.success ?? deleteState.success}</FormSuccess>
      )}
    </div>
  );
}

// Sessions der Spielleitung: oben eintragen, darunter die Liste der bisherigen
// Sessions zum Aufklappen.
export default function SessionManager({
  sessions,
  characters,
  logbooks,
  defaultSessionAp,
  apPerLogbook,
  today,
}: {
  sessions: GameSession[];
  characters: ActiveCharacter[];
  // Logbücher zur Zuordnung: die bereits zugeordneten plus alle noch freien.
  logbooks: SessionLogbook[];
  defaultSessionAp: number;
  apPerLogbook: number;
  // Vom Server vorgegeben, damit Server- und Client-Render dasselbe Datum
  // vorbelegen (ein `new Date()` im Client wiche sonst ab und würde
  // hydrieren-Warnungen erzeugen).
  today: string;
}) {
  return (
    <div className="flex flex-col gap-[24px]">
      <section className="flex flex-col gap-[12px]">
        <h2 className="text-lcars-primary">Session eintragen</h2>
        <NewSessionForm
          characters={characters}
          defaultSessionAp={defaultSessionAp}
          today={today}
        />
      </section>

      <section className="flex flex-col gap-[12px]">
        <h2 className="text-lcars-primary">Bisherige Sessions</h2>
        {sessions.length === 0 ? (
          <p className="lcars-empty-state">Noch keine Session eingetragen.</p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                characters={characters}
                logbooks={logbooks}
                apPerLogbook={apPerLogbook}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

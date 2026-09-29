"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { confirmSubmit } from "@/lib/confirmSubmit";
import { formatISODate } from "@/utils/formateISODate";
import { defaultSessionSynopsisDate } from "@/lib/sessionSynopsis";
import { missionEditHref } from "@/lib/contentRoutes";
import { fmtDate } from "@/lib/missionFormat";
import { PlusIcon, TrashIcon } from "@/lib/icons";
import type {
  GameSession,
  ActiveCharacter,
  SessionLogbook,
  SessionMissionOption,
} from "@/lib/gameSessions";
import {
  createSessionAction,
  deleteSessionAction,
  updateSessionAction,
  setSessionLogbooksAction,
  type SessionFormState,
} from "./actions";

const initialState: SessionFormState = {};

export function SessionContextFields({
  missions,
  idPrefix,
  initialMissionId,
  lockedMission = false,
  allowNewMission = true,
  initialBlocks = [],
}: {
  missions: SessionMissionOption[];
  idPrefix: string;
  initialMissionId?: number | null;
  lockedMission?: boolean;
  allowNewMission?: boolean;
  initialBlocks?: GameSession["synopsisBlocks"];
}) {
  const [missionChoice, setMissionChoice] = useState(
    initialMissionId ? `mission:${initialMissionId}` : "",
  );
  const [blocks, setBlocks] = useState(() => initialBlocks.map((block, index) => ({
    key: `${idPrefix}-${index}`,
    ingameDate: block.ingameDate,
    body: block.body,
  })));
  return (
    <div className="flex flex-col gap-[8px]">
      <label className="flex flex-col gap-[4px]">
        <span className="lcars-eyebrow">Zugehörige Mission</span>
        {lockedMission && initialMissionId ? (
          <>
            <input type="hidden" name="missionChoice" value={`mission:${initialMissionId}`} />
            <span className="lcars-input rounded-full">{missions.find((mission) => mission.id === initialMissionId)?.title ?? "Mission"}</span>
          </>
        ) : <select
          name="missionChoice"
          required
          value={missionChoice}
          onChange={(event) => setMissionChoice(event.target.value)}
          className="lcars-input rounded-full"
        >
          <option value="" disabled>
            Mission auswählen
          </option>
          {missions.map((mission) => (
            <option key={mission.id} value={`mission:${mission.id}`}>
              {mission.title}
            </option>
          ))}
          {allowNewMission && (
            <option value="new">Neue Mission anlegen…</option>
          )}
        </select>}
      </label>
      {missions.length === 0 && !allowNewMission && (
        <p className="lcars-empty-state">
          Es gibt keine veröffentlichte Mission zur Auswahl.
        </p>
      )}
      {missionChoice === "new" && (
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Titel der neuen Mission</span>
          <input
            name="newMissionTitle"
            required
            maxLength={200}
            className="lcars-input rounded-full"
          />
        </label>
      )}
      <fieldset className="flex flex-col gap-[8px]">
        <legend className="lcars-eyebrow">Zusammenfassung (optional)</legend>
        {blocks.map((block, index) => (
          <div
            key={block.key}
            className="flex flex-col gap-[6px] rounded-lg border border-[var(--lcars-ink-dim)]/30 p-[8px]"
          >
            <div className="flex flex-wrap gap-[8px]">
              <label className="flex flex-col gap-[4px]">
                <span className="lcars-eyebrow">Ingame-Datum</span>
                <input
                  type="date"
                  name="synopsisDate"
                  required
                  value={block.ingameDate}
                  onChange={(event) =>
                    setBlocks((current) =>
                      current.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              ingameDate: event.target.value,
                            }
                          : item,
                      ),
                    )
                  }
                  className="lcars-input rounded-full"
                />
              </label>
              <button
                type="button"
                className="lcars-icon-btn self-end"
                aria-label={`Zusammenfassungsblock ${index + 1} entfernen`}
                title="Zusammenfassungsblock entfernen"
                onClick={() =>
                  setBlocks((current) => current.filter((_, i) => i !== index))
                }
              ><TrashIcon /></button>
            </div>
            <MarkdownEditor id={`${idPrefix}-synopsis-${index}`} name="synopsisText" rows={6} defaultValue={block.body} />
          </div>
        ))}
        <button
          type="button"
          className="lcars-icon-btn self-start"
          aria-label="Zusammenfassungsblock hinzufügen"
          title="Zusammenfassungsblock hinzufügen"
          onClick={() =>
            setBlocks((current) => {
              const ingameDate = defaultSessionSynopsisDate(
                missions.find((mission) => `mission:${mission.id}` === missionChoice)?.startedAt,
                current,
              );
              return [
                ...current,
                {
                  key: crypto.randomUUID(),
                  ingameDate,
                  body: "",
                },
              ];
            })
          }
        ><PlusIcon /></button>
      </fieldset>
    </div>
  );
}

// Anlegen: Datum, Mission, AP-Beträge, Teilnehmende und optionale Synopsisblöcke. Die
// Teilnehmenden sind vorausgewählt — die Regel lautet „alle aktiven
// Charaktere", wer gefehlt hat, wird abgewählt.
function NewSessionForm({
  characters,
  missions,
  defaultSessionAp,
  today,
}: {
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
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

      <SessionContextFields missions={missions} idPrefix="new-session" />

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

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Session nachtragen
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
  missions,
  logbooks,
  apPerLogbook,
}: {
  session: GameSession;
  // Auswahl für „Gutschreiben an" — dieselbe Liste wie beim Anlegen.
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
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
    <div
      id={`session-${session.id}`}
      className="scroll-mt-24 flex flex-col gap-[6px] border-b border-[var(--lcars-ink-dim)]/30 pb-[8px]"
    >
      {session.synopsisBlocks.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          {session.synopsisBlocks.map((block) => (
            <article key={block.id} id={`summary-${block.id}`} className="scroll-mt-24 rounded-lg border border-[var(--lcars-ink-dim)]/25 p-[10px]">
              <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                <h3 className="font-semibold">{session.missionTitle ?? "Mission"} - Eintrag {session.missionSessionNumber ?? "?"}</h3>
                <span className="lcars-eyebrow">{fmtDate(block.ingameDate)}</span>
              </div>
              <div className="mission-body" dangerouslySetInnerHTML={{ __html: block.bodyHtml }} />
              {session.missionSlug && <Link className="lcars-back-link mt-[6px] inline-block" href={`${missionEditHref(session.missionSlug)}#summary-${block.id}`}>Bearbeiten</Link>}
            </article>
          ))}
        </div>
      )}
      <button
        type="button"
        className="flex flex-wrap items-center gap-[8px] text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Auf-/Zuklapp-Anzeige links wie bei den DataRow-Akkordeons — dreht
            sich, wenn die Session-Details offen sind. */}
        <span
          className={
            open
              ? "lcars-data-row-chevron lcars-data-row-chevron--open"
              : "lcars-data-row-chevron"
          }
          style={{ margin: "0 4px 0 2px" }}
          aria-hidden="true"
        />
        <span className="lcars-eyebrow">
          {formatISODate(session.sessionDate)}
        </span>
        <span className="flex-1 min-w-[180px]">
          {session.title || "Ohne Titel"}
        </span>
        {session.missionTitle && (
          <span className="text-lcars-ink-dim text-[12px]">
            {session.missionTitle}
          </span>
        )}
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

            <SessionContextFields
              missions={missions}
              idPrefix={`session-${session.id}`}
              initialMissionId={session.missionId}
              allowNewMission={false}
              initialBlocks={session.synopsisBlocks}
            />

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

      <FormError message={state.error ?? deleteState.error} />
      {(state.success ?? deleteState.success) && (
        <FormSuccess>{state.success ?? deleteState.success}</FormSuccess>
      )}
    </div>
  );
}

// Sessions der Spielleitung: oben das (zugeklappte) Nachtragen von Hand,
// darunter die Liste der bisherigen Sessions zum Aufklappen.
//
// Der übliche Weg ist der Knopf „Session eintragen" am angekündigten Termin
// (PlannedSessionManager) — er bringt Datum, Mission und Besetzung schon mit.
// Von Hand nachgetragen wird, was ohne Ankündigung gespielt wurde; deshalb
// steht dieses Formular zugeklappt.
export default function SessionManager({
  sessions,
  characters,
  missions,
  logbooks,
  defaultSessionAp,
  apPerLogbook,
  today,
  showCreateForm = true,
  sessionsHeading = "Bisherige Sessions",
  groupByMission = false,
}: {
  sessions: GameSession[];
  characters: ActiveCharacter[];
  missions: SessionMissionOption[];
  // Logbücher zur Zuordnung: die bereits zugeordneten plus alle noch freien.
  logbooks: SessionLogbook[];
  defaultSessionAp: number;
  apPerLogbook: number;
  // Vom Server vorgegeben, damit Server- und Client-Render dasselbe Datum
  // vorbelegen (ein `new Date()` im Client wiche sonst ab und würde
  // hydrieren-Warnungen erzeugen).
  today: string;
  showCreateForm?: boolean;
  sessionsHeading?: string;
  groupByMission?: boolean;
}) {
  const [sessionFilter, setSessionFilter] = useState("");
  const [missionFilter, setMissionFilter] = useState("");
  const filteredSessions = useMemo(() => sessions.filter((session) => {
    const missionMatch = !missionFilter || String(session.missionId ?? "") === missionFilter;
    const q = sessionFilter.trim().toLocaleLowerCase("de");
    const textMatch = !q || [session.title, session.missionTitle, session.sessionDate, ...session.synopsisBlocks.map((block) => block.body)]
      .some((value) => value?.toLocaleLowerCase("de").includes(q));
    return missionMatch && textMatch;
  }), [sessions, missionFilter, sessionFilter]);
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, { title: string; sessions: GameSession[] }>();
    for (const session of filteredSessions) {
      const key = String(session.missionId ?? "none");
      const group = groups.get(key) ?? { title: session.missionTitle ?? "Ohne Mission", sessions: [] };
      group.sessions.push(session);
      groups.set(key, group);
    }
    return [...groups.entries()];
  }, [filteredSessions]);
  return (
    <div className="flex flex-col gap-[24px]">
      {showCreateForm && (
        <details className="lcars-collapsible">
          <summary className="lcars-collapsible-summary">
            <h2 className="text-lcars-primary-ink">Session nachtragen</h2>
          </summary>
          <div className="pt-[12px]">
            <NewSessionForm
              characters={characters}
              missions={missions}
              defaultSessionAp={defaultSessionAp}
              today={today}
            />
          </div>
        </details>
      )}

      <section className="flex flex-col gap-[12px]">
        <h2 className="text-lcars-primary-ink">{sessionsHeading}</h2>
        {groupByMission && <div className="flex flex-wrap gap-[8px]">
          <label className="flex min-w-[220px] flex-1 flex-col gap-[4px]"><span className="lcars-eyebrow">Session suchen</span><input className="lcars-input rounded-full" type="search" value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} placeholder="Titel, Datum oder Zusammenfassung" /></label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-[4px]"><span className="lcars-eyebrow">Mission filtern</span><select className="lcars-input rounded-full" value={missionFilter} onChange={(event) => setMissionFilter(event.target.value)}><option value="">Alle Missionen</option>{missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}</select></label>
        </div>}
        {filteredSessions.length === 0 ? (
          <p className="lcars-empty-state">Noch keine Session eingetragen.</p>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {groupByMission ? groupedSessions.map(([key, group]) => <details key={key} className="lcars-details">
              <summary className="lcars-details-summary"><span className="lcars-data-row-chevron" aria-hidden="true" /><span className="font-semibold">{group.title}</span><span className="text-lcars-ink-dim text-[13px]"> · {group.sessions.length}</span></summary>
              <div className="mt-[12px] flex flex-col gap-[8px]">{group.sessions.map((session) => <SessionRow key={session.id} session={session} characters={characters} missions={missions} logbooks={logbooks} apPerLogbook={apPerLogbook} />)}</div>
            </details>) : filteredSessions.map((session) => (
              <SessionRow key={session.id} session={session} characters={characters} missions={missions} logbooks={logbooks} apPerLogbook={apPerLogbook} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

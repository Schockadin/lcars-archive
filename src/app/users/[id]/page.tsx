import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  getPublicCharactersForUser,
  getPublicLogsForUser,
} from "@/lib/characters";
import { getPublicDialoguesForUser } from "@/lib/dialogues";
import { getPublicArchiveEntriesForUser } from "@/lib/archive";
import { resolveFollowState } from "@/lib/follows";
import { LcarsDataRow } from "@/components/lcars";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import { sessionLabel, fmtDate } from "@/lib/missionFormat";
import FollowButtons from "@/components/FollowButtons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const target = await getUserById(Number(id));
  return {
    title: target ? target.name : "User",
    robots: { index: false, follow: false },
  };
}

// Öffentliche Profilseite eines Users: zeigt nur dessen public Inhalte
// (Charaktere, Einsatzberichte, Gespräche, Archiv-Einträge) — Gegenstück zu
// /user/content ("Meine Inhalte", ALLE eigenen Inhalte inkl. privat,
// nur für den Owner selbst). Reine Lesansicht ohne Sichtbarkeits-Switches
// oder Bearbeiten-Links, dafür mit FollowButtons zum Userabo (siehe
// notifyUserSubscribers in lib/follows.ts).
export default async function UserPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Betrachter (requireNonGuest) und Routen-Param sind unabhängig — parallel.
  const [viewer, { id }] = await Promise.all([requireNonGuest(), params]);
  const targetId = Number(id);
  if (!Number.isInteger(targetId)) {
    redirect("/users");
  }

  const target = await getUserById(targetId);
  if (!target) {
    redirect("/users");
  }

  // Öffentliche Inhalte des Users + der eigene Follow-Stand parallel. Letzterer
  // wird an FollowButtons als initialState durchgereicht (kein Client-Fetch
  // nach der Hydration) — aber nur, wenn das Abo-Widget überhaupt erscheint
  // (nicht auf dem eigenen Profil, viewer.id === target.id).
  const [characters, logs, dialogues, archiveEntries, followInitialState] =
    await Promise.all([
      getPublicCharactersForUser(target.id),
      getPublicLogsForUser(target.id),
      getPublicDialoguesForUser(target.id),
      getPublicArchiveEntriesForUser(target.id),
      viewer.id !== target.id
        ? resolveFollowState(viewer.id, "user", target.slug)
        : Promise.resolve(undefined),
    ]);

  const total =
    characters.length + logs.length + dialogues.length + archiveEntries.length;

  return (
    <>
      <PageMeta title={target.name} section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <div className="flex flex-wrap items-start justify-between gap-[16px]">
          <h1>{target.name}</h1>
          {viewer.id !== target.id && (
            <FollowButtons
              targetType="user"
              targetSlug={target.slug}
              showShare={false}
              initialState={followInitialState}
            />
          )}
        </div>

        {total === 0 ? (
          <p className="lcars-empty-state">
            Noch keine öffentlichen Inhalte vorhanden.
          </p>
        ) : (
          <div className="lcars-text flex flex-col gap-[16px]">
            {characters.length > 0 && (
              <LcarsDataRow
                value={characters.length}
                label="Charaktere"
                color="var(--lcars-primary)"
              >
                <div className="flex flex-col gap-[6px]">
                  {characters.map((c) => (
                    <Link
                      key={c.id}
                      href={`/characters/${c.slug}`}
                      className="mission-akte flex-1"
                      style={
                        {
                          "--mission-color": "var(--lcars-primary)",
                        } as React.CSSProperties
                      }
                    >
                      <span className="mission-akte-rail" />
                      <span className="mission-akte-body text-left">
                        <span className="mission-akte-title block">
                          {c.name}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </LcarsDataRow>
            )}

            {logs.length > 0 && (
              <LcarsDataRow
                value={logs.length}
                label="Einsatzberichte"
                color="var(--lcars-tertiary)"
              >
                <div className="flex flex-col gap-[6px]">
                  {logs.map((log) => (
                    <Link
                      key={log.id}
                      href={`/missions/${log.mission_slug}/${log.slug}`}
                      className="mission-akte flex-1"
                      style={
                        {
                          "--mission-color": "var(--lcars-tertiary)",
                        } as React.CSSProperties
                      }
                    >
                      <span className="mission-akte-rail" />
                      <span className="mission-akte-body text-left">
                        <span className="mission-akte-title block">
                          {log.title}
                        </span>
                        <span className="mission-akte-meta">
                          <span>
                            <b>Session</b> {sessionLabel(log.session_nr)}
                          </span>
                          <span>
                            <b>Datum</b> {fmtDate(log.log_date)}
                          </span>
                          <span>
                            <b>Mission</b> {log.mission_title}
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </LcarsDataRow>
            )}

            {dialogues.length > 0 && (
              <LcarsDataRow
                value={dialogues.length}
                label="Gespräche"
                color="var(--lcars-text-data)"
              >
                <div className="flex flex-col gap-[6px]">
                  {dialogues.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/archive/${d.slug}`}
                      className="mission-akte flex-1"
                      style={
                        {
                          "--mission-color": "var(--lcars-quinary)",
                        } as React.CSSProperties
                      }
                    >
                      <span className="mission-akte-rail" />
                      <span className="mission-akte-body text-left">
                        <span className="mission-akte-title block">
                          {d.title}
                        </span>
                        <span className="mission-akte-meta">
                          <span>
                            <b>Teilnehmer</b> {d.participantNames.join(", ")}
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </LcarsDataRow>
            )}

            {archiveEntries.length > 0 && (
              <LcarsDataRow
                value={archiveEntries.length}
                label="Archiv-Einträge"
                color="var(--lcars-secondary)"
              >
                <div className="flex flex-col gap-[6px]">
                  {archiveEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/archive/${entry.slug}`}
                      className="mission-akte flex-1"
                      style={
                        {
                          "--mission-color": "var(--lcars-secondary)",
                        } as React.CSSProperties
                      }
                    >
                      <span className="mission-akte-rail" />
                      <span className="mission-akte-body text-left">
                        <span className="mission-akte-title block">
                          {entry.title}
                        </span>
                        <span className="mission-akte-meta">
                          <span>
                            <b>Kategorie</b>{" "}
                            {CATEGORY_CONFIG[entry.category].label}
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </LcarsDataRow>
            )}
          </div>
        )}
      </article>
    </>
  );
}

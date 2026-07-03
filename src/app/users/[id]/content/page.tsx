import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { LcarsDataRow } from "@/components/lcars";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";

export const metadata: Metadata = {
  title: "Meine Inhalte",
  robots: { index: false, follow: false },
};

export default async function UserContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireOwnCharacters(id);

  const [logs, dialogues] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <h1>Meine Inhalte</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <section className="flex flex-col gap-[8px]">
            <LcarsDataRow
              value={logs.length}
              label="Einsatzberichte"
              color="var(--lcars-blue)"
              className="lcars-data-row--full"
            />

            {logs.length === 0 ? (
              <p className="lcars-empty-state">
                Noch keine Einsatzberichte verfasst.
              </p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {logs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/missions/${log.mission_slug}/${log.slug}`}
                    className="mission-akte"
                    style={
                      {
                        "--mission-color": "var(--lcars-blue)",
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
            )}
          </section>

          <section className="flex flex-col gap-[8px]">
            <LcarsDataRow
              value={dialogues.length}
              label="Gespräche"
              color="var(--lcars-text-data)"
              className="lcars-data-row--full"
            />

            {dialogues.length === 0 ? (
              <p className="lcars-empty-state">
                Noch keine Gespräche begonnen.
              </p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {dialogues.map((d) => (
                  <Link
                    key={d.slug}
                    href={
                      d.open ? `/dialogues/${d.slug}` : `/archive/${d.slug}`
                    }
                    className="mission-akte"
                    style={
                      {
                        "--mission-color": d.open
                          ? "var(--lcars-green)"
                          : "var(--lcars-red)",
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
                          <b>Gesprächspartner</b> {d.partnerName}
                        </span>
                        <span>
                          <b>Status</b> {d.open ? "Offen" : "Abgeschlossen"}
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </article>
    </>
  );
}

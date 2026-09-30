import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { getGameSession, listCharactersForSessionEdit, listGameSessions, listSessionMissions } from "@/lib/gameSessions";
import { missionEditHref, missionHref } from "@/lib/contentRoutes";
import { fmtDate } from "@/lib/missionFormat";
import { SessionDetails } from "../SessionManager";

export const metadata: Metadata = {
  title: "Session",
  robots: { index: false, follow: false },
};

export default async function GmSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireGM();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) notFound();
  const session = await getGameSession(id);
  if (!session) notFound();
  const [characters, missions, sessionHistory] = await Promise.all([
    listCharactersForSessionEdit(id),
    listSessionMissions(),
    listGameSessions(),
  ]);
  const participants = characters.filter((character) => session.characterIds.includes(character.id));

  return (
    <>
      <PageMeta title={session.title || "Session"} section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <Link href="/gm/sessions" className="lcars-back-link">‹ Sessions</Link>
          {session.missionSlug && <div className="flex flex-wrap gap-[8px]">
            <Link href={missionEditHref(session.missionSlug)} className="lcars-pill-btn--outline">Mission verwalten</Link>
            <Link href={missionHref(session.missionSlug)} className="lcars-pill-btn--outline">Mission ansehen</Link>
          </div>}
        </div>
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>{session.title || "Session"}</h1>
        <div className="lcars-text mt-[12px] flex flex-col gap-[20px]">
          <dl className="flex flex-wrap items-baseline gap-x-[24px] gap-y-[10px]">
            <div><dt className="lcars-eyebrow">Spieltermin</dt><dd>{fmtDate(session.sessionDate)}</dd></div>
            <div><dt className="lcars-eyebrow">Mission</dt><dd>{session.missionTitle ?? "Ohne Mission"}</dd></div>
            <div><dt className="lcars-eyebrow">AP je Charakter</dt><dd>{session.sessionAp}{session.bonusAp > 0 && ` + ${session.bonusAp} Bonus`} AP</dd></div>
            <div><dt className="lcars-eyebrow">AP gesamt</dt><dd>{session.totalAp} AP</dd></div>
            <div><dt className="lcars-eyebrow">Eingetragen von</dt><dd>{session.createdByName ?? "Unbekannt"}</dd></div>
          </dl>
          <section>
            <h2 className="text-lcars-primary-ink">Teilnehmende ({session.characterCount})</h2>
            {participants.length === 0 ? <p className="lcars-empty-state">Keine Charaktere zugeordnet.</p> : (
              <ul className="flex flex-wrap gap-x-[20px] gap-y-[6px]">
                {participants.map((character) => <li key={character.id}>
                  {character.name}{character.playerName && <span className="text-lcars-ink-dim"> · {character.playerName}</span>}
                </li>)}
              </ul>
            )}
          </section>
          <SessionDetails session={session} characters={characters} missions={missions} sessionHistory={sessionHistory} detailPage />
        </div>
      </article>
    </>
  );
}

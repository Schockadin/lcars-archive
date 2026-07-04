import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { getArchiveEntriesForUser } from "@/lib/archive";
import UserContentBrowser from "./UserContentBrowser";

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
  const { user, characters } = await requireOwnCharacters(id);

  const [logs, dialogues, archiveEntries] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
    getArchiveEntriesForUser(user.id),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Meine Inhalte</h1>

        {characters.length > 0 && (
          <div className="flex flex-col flex-wrap gap-[12px]">
            <Link
              href={`/users/${user.id}/mission-logs/new`}
              className="lcars-switch"
            >
              Neuer Missionslog
            </Link>
            <Link
              href={`/users/${user.id}/dialogues/new`}
              className="lcars-switch"
            >
              Neues Gespräch
            </Link>
          </div>
        )}

        <p className="lcars-text text-[13px] mt-[20px]">
          Sichtbarkeit je Eintrag: Privat (nur du) · GM (du + Spielleitung) ·
          Öffentlich (alle).
        </p>

        <div className="lcars-text">
          <UserContentBrowser
            characters={characters}
            logs={logs}
            dialogues={dialogues}
            archiveEntries={archiveEntries}
            ownUserId={user.id}
          />
        </div>
      </article>
    </>
  );
}

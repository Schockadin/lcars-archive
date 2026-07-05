import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { getArchiveEntriesForUser } from "@/lib/archive";
import { getAllMissions } from "@/lib/missions";
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
  const isGM = user.role === "gm" || user.role === "admin";

  const [logs, dialogues, archiveEntries, missions] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
    getArchiveEntriesForUser(user.id),
    isGM ? getAllMissions() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Meine Inhalte</h1>

        <div className="flex flex-col flex-wrap gap-[12px]">
          {/* Anders als Missionslog/Gespräch (eigener Charakter) oder Mission
              (gm/admin) sind Archiv-Einträge an keine Voraussetzung
              geknüpft — jeder eingeloggte User darf welche anlegen. */}
          <Link href={`/users/${user.id}/archive/new`} className="lcars-switch">
            Neuer Archiv-Eintrag
          </Link>
          {/* Genau wie Archiv-Einträge an keine Voraussetzung geknüpft
              (bewusst NICHT hinter characters.length > 0 versteckt — genau
              damit legt man seinen ERSTEN eigenen Charakter an) — außer
              Gast-Accounts, siehe requireOwnCharacters/new/actions.ts. */}
          {user.role !== "guest" && (
            <Link
              href={`/users/${user.id}/characters/new`}
              className="lcars-switch"
            >
              Neuer Charakter
            </Link>
          )}
          {characters.length > 0 && (
            <>
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
            </>
          )}
          {isGM && (
            <Link
              href={`/users/${user.id}/missions/new`}
              className="lcars-switch"
            >
              Neue Mission
            </Link>
          )}
        </div>

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
            missions={missions}
            canManageMissions={isGM}
            ownUserId={user.id}
          />
        </div>
      </article>
    </>
  );
}

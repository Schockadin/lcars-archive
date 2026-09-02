import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { getArchiveEntriesForUser } from "@/lib/archive";
import { getAllMissionsIncludingDrafts } from "@/lib/missions";
import UserContentBrowser from "./UserContentBrowser";

export const metadata: Metadata = {
  title: "Meine Inhalte",
  robots: { index: false, follow: false },
};

export default async function UserContentPage() {
  const { user, characters } = await requireOwnCharacters();
  const roleMap = await getRoleMap();
  const isGM = userCan(user, "missions.manage", roleMap);
  // Die Spielleitung kann ein Gespräch auch ohne eigenen Charakter beginnen —
  // aus Sicht eines NPC (siehe /user/dialogues/new).
  const canStartDialogue = characters.length > 0 || userCan(user, "gm.access", roleMap);

  const [logs, dialogues, archiveEntries, missions] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
    getArchiveEntriesForUser(user.id),
    isGM ? getAllMissionsIncludingDrafts() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      <h1>Meine Inhalte</h1>
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)] gap-[20px] lcars-flex-switch">
        <section className="flex flex-col gap-[12px] justify-center items-end">
          <h2>Neue Inhalte</h2>
          <div className="flex flex-col gap-[12px] max-sm:w-full">
            {characters.length > 0 && (
              <Link
                href="/user/mission-logs/new"
                className="min-w-[250px] lcars-pill-btn max-sm:w-full max-sm:self-stretch"
              >
                Neuer Missionslog
              </Link>
            )}
            {canStartDialogue && (
              <Link
                href="/user/dialogues/new"
                className="min-w-[250px] lcars-pill-btn max-sm:w-full max-sm:self-stretch"
              >
                Neues Gespräch
              </Link>
            )}
            {/* Anders als Missionslog/Gespräch (eigener Charakter) oder
                Mission (gm/admin) sind Archiv-Einträge an keine
                Voraussetzung geknüpft — jeder eingeloggte User darf welche
                anlegen. */}
            <Link
              href="/user/archive/new"
              className="min-w-[250px] lcars-pill-btn max-sm:w-full max-sm:self-stretch"
            >
              Neuer Archiv-Eintrag
            </Link>
            {/* Genau wie Archiv-Einträge an keine Voraussetzung geknüpft
                (bewusst NICHT hinter characters.length > 0 versteckt — genau
                damit legt man seinen ERSTEN eigenen Charakter an) — außer
                Gast-Accounts, siehe requireOwnCharacters/new/actions.ts. */}
            {userCan(user, "content.create", roleMap) && (
              <Link
                href="/user/characters/new"
                className="min-w-[250px] lcars-pill-btn max-sm:w-full max-sm:self-stretch"
              >
                Neuer Charakter
              </Link>
            )}
            {isGM && (
              <Link
                href="/user/missions/new"
                className="min-w-[250px] lcars-pill-btn max-sm:w-full max-sm:self-stretch"
              >
                Neue Mission
              </Link>
            )}
          </div>
        </section>

        <section className="flex flex-col items-end gap-[12px]">
          <h2>Inhalte verwalten</h2>
          <div className="lcars-text w-full">
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
        </section>
      </article>
    </>
  );
}

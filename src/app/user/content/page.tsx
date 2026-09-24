import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import PageMeta from "@/components/PageMeta";
import { LcarsCollapsiblePanel } from "@/components/lcars";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { getArchiveEntriesForUser } from "@/lib/archive";
import { getOwnDrafts } from "@/lib/drafts";
import { getAllMissionsIncludingDrafts } from "@/lib/missions";
import UserContentBrowser from "./UserContentBrowser";
import DraftsSection from "@/app/DraftsSection";
import NewContentPanel from "./NewContentPanel";
import { loadNewContentData } from "./newContentData";
import HelpHeading from "@/components/help/HelpHeading";
import { MyContentGuide } from "@/components/help/guides/UserGuides";
import {
  listCharactersForEvents,
  listManualEventsForUser,
} from "@/lib/timelineManualEvents";

export const metadata: Metadata = {
  title: "Meine Inhalte",
  robots: { index: false, follow: false },
};

export default async function UserContentPage() {
  const { user, characters } = await requireOwnCharacters();
  const roleMap = await getRoleMap();
  const isGM = userCan(user, "missions.manage", roleMap);
  // Nur Slug und Name an die Client-Komponente: die vollen Charakter-Objekte
  // tragen den Werte-Teilbaum (keepStats in getCharactersForUser) und hätten
  // ihn ungenutzt im RSC-Payload mitgeschickt.
  const characterFilterOptions = characters.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  const [
    logs,
    dialogues,
    archiveEntries,
    missions,
    drafts,
    newContent,
    manualEvents,
    eventCharacters,
  ] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
    getArchiveEntriesForUser(user.id),
    isGM ? getAllMissionsIncludingDrafts() : Promise.resolve([]),
    // Eigene Abfrage statt einer Ableitung aus den Listen darüber: Die
    // suchen über Besitz UND Teilnahme, „meine Entwürfe" fragt nur nach
    // Besitz (siehe getOwnDrafts). Dieselbe Liste steht auf der
    // Startseite.
    getOwnDrafts(user.id),
    // Die Auswahllisten der Anlege-Formulare — hier alle, weil diese Seite
    // alle Knöpfe zeigt. Der gemeinsame Ladeweg mit dem Dashboard steht in
    // newContentData.ts.
    loadNewContentData(user, characters, roleMap, {
      missionLog: true,
      dialogue: true,
      mission: true,
      event: true,
    }),
    listManualEventsForUser(user.id),
    // Bearbeiten bleibt auch möglich, wenn das Anlegerecht später entzogen
    // wurde. Deshalb hängt diese Liste nicht an newContent.event.
    listCharactersForEvents(),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      {/* Überschrift und Inhalt teilen sich die zentrierte Spalte, damit der
          Titel über dem Inhalt sitzt und nicht am linken Rand (Breite wie
          /chronologie, /search). */}
      <div className="lcars-wide-column">
        <HelpHeading title="Meine Inhalte" tutorial="mein-bereich">
          <MyContentGuide />
        </HelpHeading>
        {/* Die Knöpfe stehen ÜBER der Liste, nicht daneben: neben ihr blieb
            dem Inhaltsbrowser nur eine schmale Restspalte, obwohl er die
            Tabelle mit den meisten Spalten dieser Seite trägt. */}
        <article className="mb-[10px] flex flex-col gap-[20px]">
          {/* Derselbe Abschnitt wie auf der Startseite (NewContentPanel) —
              hier mit allen Knöpfen und aufgeklappt: Etwas anzulegen ist der
              Zweck dieser Seite, nicht eine Möglichkeit am Rande. */}
          <NewContentPanel
            data={newContent}
            canImport
            storageId="content:anlegen"
          />

          {/* Über der Liste: was noch unfertig ist. Dieselbe Komponente wie
              auf der Startseite. */}
          <DraftsSection drafts={drafts} storageId="content:entwuerfe" />

          {/* Die Liste bringt ihre eigenen Abschnittsüberschriften mit (eine
              je Kategorie, wie die Buchstaben der Datenbank und die Monate
              der Chronologie) — die Klappe darum trägt deshalb nur die
              Gesamtzahl. */}
          <LcarsCollapsiblePanel
            title="Alle Inhalte"
            badge={
              logs.length +
              dialogues.length +
              archiveEntries.length +
              missions.length +
              manualEvents.length
            }
            storageId="content:liste"
          >
            <div className="lcars-text w-full">
              <UserContentBrowser
                characters={characterFilterOptions}
                logs={logs}
                dialogues={dialogues}
                archiveEntries={archiveEntries}
                missions={missions}
                manualEvents={manualEvents}
                eventCharacters={eventCharacters}
                canManageMissions={isGM}
                canLinkAnyContent={userCan(
                  user,
                  "content.autolink_tools",
                  roleMap,
                )}
                ownUserId={user.id}
              />
            </div>
          </LcarsCollapsiblePanel>
        </article>
      </div>
    </>
  );
}

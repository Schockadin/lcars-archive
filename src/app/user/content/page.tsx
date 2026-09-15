import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import { canPlayNpcs, canView, resolveViewer } from "@/lib/visibility";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../dal";
import {
  getCharactersForParticipantPicker,
  getCharactersWithPlayers,
  getLogsForUser,
} from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import {
  getAllArchiveEntries,
  getArchiveEntriesForUser,
  getNpcOptions,
} from "@/lib/archive";
import {
  getAllMissions,
  getAllMissionsIncludingDrafts,
  getMostRecentLogDate,
  getNextSessionNr,
} from "@/lib/missions";
import { listGmUsers } from "@/lib/users";
import UserContentBrowser from "./UserContentBrowser";
import NewContentButtons, { type NewContentData } from "./NewContentButtons";
import HelpHeading from "@/components/help/HelpHeading";
import { MyContentGuide } from "@/components/help/guides/UserGuides";

export const metadata: Metadata = {
  title: "Meine Inhalte",
  robots: { index: false, follow: false },
};

export default async function UserContentPage() {
  const { user, characters } = await requireOwnCharacters();
  const roleMap = await getRoleMap();
  const isGM = userCan(user, "missions.manage", roleMap);
  // Die Spielleitung kann ein Gespräch auch ohne eigenen Charakter beginnen —
  // aus Sicht eines NPC (siehe /user/dialogues/new). Maßgeblich ist deshalb
  // dieselbe Regel wie dort (canPlayNpcs = gm.access ODER admin.access), sonst
  // fehlte einem reinen Admin-Konto der Knopf für einen Weg, der für es
  // funktioniert.
  const viewer = resolveViewer(user, roleMap);
  const playsNpcs = canPlayNpcs(viewer);
  // Nur eigene bereits veröffentlichte Charaktere kommen als Autor eines Logs
  // oder als Gesprächsstarter infrage — dieselbe Regel wie auf den
  // Anlege-Seiten (ein Entwurf ist für niemand außer dem Owner sichtbar).
  const publishedCharacters = characters.filter((c) => !c.is_draft);
  const ownCharacterOptions = publishedCharacters.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
  }));
  // Nur Slug und Name an die Client-Komponente: die vollen Charakter-Objekte
  // tragen den Werte-Teilbaum (keepStats in getCharactersForUser) und hätten
  // ihn ungenutzt im RSC-Payload mitgeschickt.
  const characterFilterOptions = characters.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  const [logs, dialogues, archiveEntries, missions] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
    getArchiveEntriesForUser(user.id),
    isGM ? getAllMissionsIncludingDrafts() : Promise.resolve([]),
  ]);

  // Die Anlege-Formulare öffnen sich hier in einem Fenster (siehe
  // NewContentButtons.tsx) und können darin nichts nachladen — ihre
  // Auswahllisten und Vorbelegungen entstehen deshalb schon hier. Geladen
  // wird nur, was der jeweilige Knopf überhaupt zeigt: ohne eigenen
  // veröffentlichten Charakter kein Log-Formular, ohne Spielleitung kein
  // Missions-Formular.
  const canWriteLog = publishedCharacters.length > 0;
  const npcOptions = (await getNpcOptions()).filter((npc) =>
    canView(npc.isDraft, npc.ownerUserId, viewer),
  );
  const canStartDialogue = canWriteLog || (playsNpcs && npcOptions.length > 0);

  const [
    logMissions,
    defaultLogDate,
    partnerCharacters,
    allArchiveEntries,
    gms,
    participantOptions,
  ] = await Promise.all([
    canWriteLog ? getAllMissions() : Promise.resolve([]),
    // Auch das Missions-Formular belegt damit sein Startdatum vor.
    canWriteLog || canStartDialogue || isGM
      ? getMostRecentLogDate()
      : Promise.resolve(null),
    canStartDialogue ? getCharactersWithPlayers(user.id) : Promise.resolve([]),
    canStartDialogue ? getAllArchiveEntries() : Promise.resolve([]),
    // Wer kann für die NPCs schreiben? Nur nötig, wenn es überhaupt NPCs zur
    // Auswahl gibt und die anfragende Person sie nicht selbst spielt.
    canStartDialogue && npcOptions.length > 0 && !playsNpcs
      ? listGmUsers()
      : Promise.resolve([]),
    isGM ? getCharactersForParticipantPicker() : Promise.resolve([]),
  ]);

  // Grober Vorschlagswert für die Session-Nr (erster eigener Charakter, erste
  // Mission) — wie unter /user/mission-logs/new, das Feld bleibt editierbar.
  const nextSessionNr =
    canWriteLog && logMissions[0]
      ? await getNextSessionNr(logMissions[0].id, publishedCharacters[0].id)
      : 1;

  const newContent: NewContentData = {
    userId: user.id,
    isAdminOrGM: userCan(user, "content.autolink_tools", roleMap),
    // Auch ohne Missionen durchgereicht: Der Knopf bleibt sichtbar und das
    // Fenster erklärt, dass es noch nichts gibt, dem ein Log zugeordnet
    // werden könnte — wie es die Anlege-Seite tut.
    missionLog: canWriteLog
      ? {
          ownCharacters: ownCharacterOptions,
          missions: logMissions.map((m) => ({
            slug: m.slug,
            title: m.title,
          })),
          defaultSessionNr: nextSessionNr,
          defaultLogDate,
        }
      : null,
    dialogue: canStartDialogue
      ? {
          ownCharacters: ownCharacterOptions,
          partnerCharacters,
          npcs: npcOptions,
          canPlayNpcs: playsNpcs,
          gms,
          locations: allArchiveEntries
            .filter((e) => e.category === "location")
            .map((l) => ({ slug: l.slug, title: l.title })),
          defaultLogDate,
        }
      : null,
    mission: isGM
      ? { defaultStartedAt: defaultLogDate, characters: participantOptions }
      : null,
  };

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
          <section className="flex flex-col gap-[12px]">
            <h2>Neue Inhalte</h2>
            <NewContentButtons data={newContent} />
          </section>

          {/* Ohne eigene Überschrift: Die Liste bringt ihre eigenen
              Abschnittsüberschriften mit (eine je Kategorie, wie die
              Buchstaben der Datenbank und die Monate der Chronologie). */}
          <section className="flex flex-col gap-[12px]">
            <div className="lcars-text w-full">
              <UserContentBrowser
                characters={characterFilterOptions}
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
      </div>
    </>
  );
}

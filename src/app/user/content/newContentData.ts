import "server-only";
import { userCan, type RoleMap } from "@/lib/permissions";
import { canPlayNpcs, canView, resolveViewer } from "@/lib/visibility";
import {
  getCharactersForParticipantPicker,
  getCharactersWithPlayers,
} from "@/lib/characters";
import { getAllArchiveEntries, getNpcOptions } from "@/lib/archive";
import {
  getAllMissions,
  getMostRecentLogDate,
  getNextSessionNr,
} from "@/lib/missions";
import { listGmUsers } from "@/lib/users";
import { listCharactersForEvents } from "@/lib/timelineManualEvents";
import {
  listActiveCharactersForAp,
  listActiveSessionMissions,
  type ActiveCharacter,
  type SessionMissionOption,
} from "@/lib/gameSessions";
import type { CharacterWithOwner } from "@/lib/characters";
import type { CharacterParticipantOption } from "@/lib/characters";
import type { NpcOption } from "@/lib/archive";
import type { GmContact } from "@/lib/users";
import type { Character } from "@/types/character";
import type { User } from "@/types/db";
import { getSessionDefaults } from "@/lib/sessionDefaults";
import type { SessionDefaults } from "@/lib/sessionDefaultsFormat";

// Die Auswahllisten und Vorbelegungen der Anlege-Formulare (siehe
// NewContentButtons.tsx). Sie öffnen sich in einem Fenster und können darin
// nichts nachladen — alles, was sie brauchen, entsteht deshalb schon auf dem
// Server.
export interface NewContentData {
  userId: number;
  missionLog: {
    ownCharacters: { id: number; slug: string; name: string }[];
    missions: { slug: string; title: string }[];
    defaultSessionNr: number;
    defaultLogDate: string | null;
  } | null;
  dialogue: {
    ownCharacters: { id: number; slug: string; name: string }[];
    partnerCharacters: CharacterWithOwner[];
    npcs: NpcOption[];
    canPlayNpcs: boolean;
    gms: GmContact[];
    locations: { slug: string; title: string }[];
    defaultLogDate: string | null;
  } | null;
  mission: {
    defaultStartedAt: string | null;
    characters: CharacterParticipantOption[];
  } | null;
  event: {
    defaultDate: string | null;
    characters: { id: number; name: string }[];
  } | null;
  // Direktaktion für die Spielleitung auf Dashboard und /user/content.
  // Optional für bestehende Aufrufer, die diese Anlege-Leiste nicht zeigen.
  sessionPlan?: {
    characters: ActiveCharacter[];
    missions: SessionMissionOption[];
    missionCharacters: CharacterParticipantOption[];
    defaultMissionStartedAt: string | null;
    sessionDefaults: SessionDefaults;
  } | null;
}

// Welche persönlichen Formulare gebraucht werden. „Meine Inhalte" zeigt alle
// Knöpfe, das Dashboard nur die dort eingeschalteten. GM-Aktionen werden
// unabhängig davon bei passender Berechtigung geladen. Was niemand braucht,
// wird nicht abgefragt: Die Listen darunter sind nicht billig und das
// Dashboard ist die meistbesuchte Seite der Anwendung.
export interface NewContentWanted {
  missionLog?: boolean;
  dialogue?: boolean;
  mission?: boolean;
  event?: boolean;
}

// Gemeinsamer Ladeweg für /user/content und das Dashboard. Zuvor stand er nur
// in der Seite unter /user/content; das Dashboard hätte ihn sonst in leicht
// abweichender Form ein zweites Mal gebraucht, und zwei Fassungen derselben
// Berechtigungslogik laufen früher oder später auseinander.
//
// Maßgeblich bleiben ohnehin die Server-Actions der Formulare — was hier
// entsteht, füllt nur die Auswahllisten.
export async function loadNewContentData(
  user: User,
  characters: Character[],
  roleMap: RoleMap,
  wanted: NewContentWanted,
): Promise<NewContentData> {
  const canManageMissions = userCan(user, "missions.manage", roleMap);
  const canPlanSessions = userCan(user, "gm.access", roleMap);
  // Die Spielleitung kann ein Gespräch auch ohne eigenen Charakter beginnen —
  // aus Sicht eines NPC (siehe /user/dialogues/new). Maßgeblich ist dieselbe
  // Regel wie dort (canPlayNpcs = gm.access ODER admin.access), sonst fehlte
  // einem reinen Admin-Konto der Knopf für einen Weg, der für es funktioniert.
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

  const wantMissionLog = wanted.missionLog === true;
  const wantDialogue = wanted.dialogue === true;
  const wantMission = wanted.mission === true && canManageMissions;
  const wantEvent =
    wanted.event === true && userCan(user, "content.create", roleMap);

  // NPCs braucht nur das Gesprächs-Formular — und zugleich die Frage, ob es
  // überhaupt angeboten werden kann.
  const npcOptions = wantDialogue
    ? (await getNpcOptions()).filter((npc) =>
        canView(npc.isDraft, npc.ownerUserId, viewer),
      )
    : [];

  const canWriteLog = wantMissionLog && publishedCharacters.length > 0;
  const canStartDialogue =
    wantDialogue &&
    (publishedCharacters.length > 0 || (playsNpcs && npcOptions.length > 0));

  const [
    logMissions,
    defaultLogDate,
    partnerCharacters,
    allArchiveEntries,
    gms,
    participantOptions,
    eventCharacters,
    plannedCharacters,
    plannedMissions,
    sessionDefaults,
  ] = await Promise.all([
    canWriteLog ? getAllMissions() : Promise.resolve([]),
    // Auch das Missions-Formular belegt damit sein Startdatum vor.
    canWriteLog || canStartDialogue || wantMission || wantEvent || canPlanSessions
      ? getMostRecentLogDate()
      : Promise.resolve(null),
    canStartDialogue ? getCharactersWithPlayers(user.id) : Promise.resolve([]),
    canStartDialogue ? getAllArchiveEntries() : Promise.resolve([]),
    // Wer kann für die NPCs schreiben? Nur nötig, wenn es überhaupt NPCs zur
    // Auswahl gibt und die anfragende Person sie nicht selbst spielt.
    canStartDialogue && npcOptions.length > 0 && !playsNpcs
      ? listGmUsers()
      : Promise.resolve([]),
    wantMission || canPlanSessions
      ? getCharactersForParticipantPicker()
      : Promise.resolve([]),
    wantEvent ? listCharactersForEvents() : Promise.resolve([]),
    canPlanSessions ? listActiveCharactersForAp() : Promise.resolve([]),
    canPlanSessions ? listActiveSessionMissions() : Promise.resolve([]),
    canPlanSessions ? getSessionDefaults() : Promise.resolve(null),
  ]);

  // Grober Vorschlagswert für die Session-Nr (erster eigener Charakter, erste
  // Mission) — wie unter /user/mission-logs/new, das Feld bleibt editierbar.
  const nextSessionNr =
    canWriteLog && logMissions[0]
      ? await getNextSessionNr(logMissions[0].id, publishedCharacters[0].id)
      : 1;

  return {
    userId: user.id,
    // Auch ohne Missionen durchgereicht: Der Knopf bleibt sichtbar und das
    // Fenster erklärt, dass es noch nichts gibt, dem ein Log zugeordnet
    // werden könnte — wie es die Anlege-Seite tut.
    missionLog: canWriteLog
      ? {
          ownCharacters: ownCharacterOptions,
          missions: logMissions.map((m) => ({ slug: m.slug, title: m.title })),
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
    mission: wantMission
      ? { defaultStartedAt: defaultLogDate, characters: participantOptions }
      : null,
    // Für die Vorbelegung reicht hier bewusst das jüngste Logbuch-Datum.
    // Den kompletten Zeitstrahl nur für einen Formular-Knopf zu laden, würde
    // sieben zusätzliche Abfragen auf der meistbesuchten Seite auslösen.
    event: wantEvent
      ? { defaultDate: defaultLogDate, characters: eventCharacters }
      : null,
    sessionPlan:
      canPlanSessions && sessionDefaults
        ? {
            characters: plannedCharacters,
            missions: plannedMissions,
            missionCharacters: participantOptions,
            defaultMissionStartedAt: defaultLogDate,
            sessionDefaults,
          }
        : null,
  };
}

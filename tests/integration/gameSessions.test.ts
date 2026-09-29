import { describe, it, expect, vi } from "vitest";

// getAdvancementRules ist eine "use cache"-Funktion (cacheTag/cacheLife) —
// beides gibt es außerhalb von Next nicht. Gleiches Vorgehen wie in
// roles.test.ts: next/cache stubben, die Abfrage selbst läuft dann uncacht
// gegen die Testdatenbank.
vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

import sql from "@/lib/db";
import {
  createGameSession,
  listSessionMissions,
  syncSessionLogbookAp,
} from "@/lib/gameSessions";
import {
  createMissionLog,
  deleteMission,
  restoreMission,
} from "@/lib/missions";
import { insertUser, insertCharacter, insertMission } from "./helpers";

// Die automatische Logbuch-AP (reason 'logbook') hängt an einer einzigen
// Regel: hat eine Session mindestens ein nicht gelöschtes Logbuch, bekommt
// jede teilnehmende Person genau eine Buchung — sonst keine. Alles, was
// Logbücher verschiebt oder löscht, muss das nachziehen.

async function logbookAp(sessionId: number): Promise<number> {
  const rows = await sql<{ character_id: number }[]>`
    SELECT character_id FROM character_ap_entries
    WHERE session_id = ${sessionId} AND reason = 'logbook'
  `;
  return rows.length;
}

async function attachLegacyLogbook(sessionId: number, logId: number): Promise<void> {
  await sql`UPDATE mission_logs SET session_id = ${sessionId} WHERE id = ${logId}`;
}

async function setup() {
  const gm = await insertUser({ role: "gm" });
  const player = await insertUser();
  const character = await insertCharacter({ playerId: player.id });
  const mission = await insertMission();

  const sessionId = await createGameSession({
    sessionDate: "2399-01-01",
    missionId: mission.id,
    synopsisBlocks: [{
      ingameDate: "2399-01-01",
      body: "Die Crew erreicht das Ziel.",
    }],
    sessionAp: 0,
    bonusAp: 0,
    characterIds: [character.id],
    createdByUserId: gm.id,
  });

  const log = await createMissionLog({
    slug: `log-${sessionId}`,
    missionId: mission.id,
    authorId: character.id,
    title: "Testlog",
    bodyMarkdown: "",
    logDate: null,
    sessionNr: 1,
    tags: [],
    ownerUserId: player.id,
    isDraft: false,
  });

  return { gm, player, character, mission, sessionId, log };
}

describe("Sessions", () => {
  it("sortiert Missionsauswahl nach dem jüngsten Startdatum", async () => {
    const older = await insertMission({ title: "Ältere Mission" });
    const newer = await insertMission({ title: "Neuere Mission" });
    await sql`UPDATE missions SET started_at = '2399-01-01' WHERE id = ${older.id}`;
    await sql`UPDATE missions SET started_at = '2399-02-01' WHERE id = ${newer.id}`;

    const missions = await listSessionMissions();
    expect(missions.findIndex((mission) => mission.id === newer.id)).toBeLessThan(
      missions.findIndex((mission) => mission.id === older.id),
    );
  });

  it("legt eine neue Mission zusammen mit der Session an", async () => {
    const gm = await insertUser({ role: "gm" });
    const sessionId = await createGameSession({
      sessionDate: "2399-02-01",
      newMission: {
        slug: `session-created-${gm.id}`,
        title: "Aus der Session angelegte Mission",
        ownerUserId: gm.id,
      },
      synopsisBlocks: [{
        ingameDate: "2399-02-01",
        body: "Die Mission beginnt.",
      }],
      sessionAp: 0,
      bonusAp: 0,
      characterIds: [],
      createdByUserId: gm.id,
    });
    const [saved] = await sql<{ missionId: number }[]>`
      SELECT mission_id AS "missionId" FROM game_sessions WHERE id = ${sessionId}
    `;
    expect(saved.missionId).toBeGreaterThan(0);
  });

  it("speichert datierte Synopsisblöcke und erzeugt daraus die Missions-Synopsis", async () => {
    const { mission } = await setup();
    const [saved] = await sql<{ sourceMarkdown: string }[]>`
      SELECT source_md AS "sourceMarkdown" FROM missions WHERE id = ${mission.id}
    `;
    expect(saved.sourceMarkdown).toContain("## Synopsis 2399-01-01");
    expect(saved.sourceMarkdown).toContain("Die Crew erreicht das Ziel.");
  });

});

describe("Logbuch-AP beim Löschen und Wiederherstellen einer Mission", () => {
  it("nimmt die Gutschrift zurück und holt sie beim Wiederherstellen zurück", async () => {
    const { gm, mission, sessionId, log } = await setup();

    await attachLegacyLogbook(sessionId, log.id);
    await syncSessionLogbookAp(sessionId, gm.id);
    expect(await logbookAp(sessionId)).toBe(1);

    await deleteMission(mission.id, gm.id);
    expect(await logbookAp(sessionId)).toBe(0);

    await restoreMission(mission.id, gm.id);
    expect(await logbookAp(sessionId)).toBe(1);
  });
});

describe("syncSessionLogbookAp", () => {
  it("ist idempotent", async () => {
    const { gm, sessionId, log } = await setup();

    await attachLegacyLogbook(sessionId, log.id);
    await syncSessionLogbookAp(sessionId, gm.id);
    await syncSessionLogbookAp(sessionId, gm.id);

    expect(await logbookAp(sessionId)).toBe(1);
  });
});

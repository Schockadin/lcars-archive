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
  updateGameSession,
  getGameSession,
  listCharactersForSessionEdit,
  listActiveSessionMissions,
  listMissionSynopsisBlocks,
  listSessionMissions,
  syncSessionLogbookAp,
} from "@/lib/gameSessions";
import {
  createMissionLog,
  deleteMission,
  restoreMission,
} from "@/lib/missions";
import { insertUser, insertCharacter, insertMission } from "./helpers";
import { createPlannedSession, getPlannedSession } from "@/lib/plannedSessions";

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
  it("behält Block-IDs beim Bearbeiten und verweigert fremde Block-IDs", async () => {
    const { gm, character, mission, sessionId } = await setup();
    const before = (await getGameSession(sessionId))!;
    const input = { id: sessionId, sessionDate: before.sessionDate, missionId: mission.id,
      sessionAp: 1, bonusAp: 0, characterIds: [character.id], actingUserId: gm.id,
      synopsisBlocks: before.synopsisBlocks.map((block) => ({ id: block.id, ingameDate: block.ingameDate, body: "Korrigiert" })) };
    await updateGameSession(input);
    expect((await getGameSession(sessionId))?.synopsisBlocks[0]).toMatchObject({ id: before.synopsisBlocks[0].id, body: "Korrigiert" });
    await expect(updateGameSession({ ...input, synopsisBlocks: [{ id: 2147483647, ingameDate: "2399-01-01", body: "Fremd" }] })).rejects.toThrow("gehört nicht");
    expect((await getGameSession(sessionId))?.synopsisBlocks[0].body).toBe("Korrigiert");
  });

  it("verknüpft einen geplanten Termin atomar und bucht ihn nur einmal", async () => {
    const gm = await insertUser({ role: "gm" });
    const mission = await insertMission();
    const plannedSessionId = await createPlannedSession({ missionId: mission.id, scheduledAt: "2026-09-01T18:00:00Z", location: "", notes: "", characterIds: [] }, gm.id);
    const input = { missionId: mission.id, plannedSessionId, sessionDate: "2026-09-01", sessionAp: 0, bonusAp: 0, characterIds: [], synopsisBlocks: [], createdByUserId: gm.id };
    const id = await createGameSession(input);
    expect((await getPlannedSession(plannedSessionId))?.gameSessionId).toBe(id);
    expect((await getGameSession(id))?.missionSessionNumber).toBe(1);
    await expect(createGameSession(input)).rejects.toThrow("nicht mehr offen");
    expect(await sql`SELECT id FROM game_sessions WHERE mission_id = ${mission.id}`).toHaveLength(1);
  });
  it("lädt eine einzelne Session samt Teilnehmenden und Zusammenfassungsblöcken", async () => {
    const { sessionId, character, mission } = await setup();
    const session = await getGameSession(sessionId);
    expect(session).toMatchObject({ id: sessionId, missionId: mission.id, characterIds: [character.id] });
    expect(session?.synopsisBlocks).toHaveLength(1);
    expect(session?.synopsisBlocks[0]).toMatchObject({ ingameDate: "2399-01-01", missionBlockNumber: 1 });
    expect(await getGameSession(-1)).toBeNull();
  });

  it("behält inaktive Teilnehmende in der Bearbeitung, bietet fremde inaktive Figuren aber nicht an", async () => {
    const { sessionId, character, player } = await setup();
    const other = await insertCharacter({ playerId: player.id });
    await sql`UPDATE characters SET status = 'retired' WHERE id IN (${character.id}, ${other.id})`;
    const options = await listCharactersForSessionEdit(sessionId);
    expect(options.some((item) => item.id === character.id)).toBe(true);
    expect(options.some((item) => item.id === other.id)).toBe(false);
  });

  it("bietet zur Terminplanung nur aktive veröffentlichte Missionen an", async () => {
    const active = await insertMission({ title: "Laufende Mission" });
    const completed = await insertMission({ title: "Abgeschlossene Mission" });
    await sql`UPDATE missions SET status = 'completed' WHERE id = ${completed.id}`;

    const missions = await listActiveSessionMissions();
    expect(missions.some((mission) => mission.id === active.id)).toBe(true);
    expect(missions.some((mission) => mission.id === completed.id)).toBe(false);
  });

  it("nummeriert Summary-Blöcke fortlaufend über die Sessions einer Mission", async () => {
    const gm = await insertUser({ role: "gm" });
    const mission = await insertMission();
    for (const [sessionIndex, blocks] of [
      ["2399-01-01", ["A", "B", "C"]],
      ["2399-02-01", ["D", "E"]],
    ] as const) {
      await createGameSession({
        sessionDate: sessionIndex,
        missionId: mission.id,
        synopsisBlocks: blocks.map((body, index) => ({
          ingameDate: `2399-01-${String(index + 1).padStart(2, "0")}`,
          body,
        })),
        sessionAp: 0,
        bonusAp: 0,
        characterIds: [],
        createdByUserId: gm.id,
      });
    }

    const blocks = await listMissionSynopsisBlocks(mission.id);
    expect(Object.fromEntries(blocks.map((block) => [block.body, block.missionBlockNumber]))).toEqual({
      A: 1, B: 2, C: 3, D: 4, E: 5,
    });
  });

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
    expect(saved.sourceMarkdown).toContain("## 2399-01-01");
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

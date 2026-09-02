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
  setSessionLogbooks,
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

async function setup() {
  const gm = await insertUser({ role: "gm" });
  const player = await insertUser();
  const character = await insertCharacter({ playerId: player.id });
  const mission = await insertMission();

  const sessionId = await createGameSession({
    sessionDate: "2399-01-01",
    title: "Erste Session",
    sessionAp: 0,
    bonusAp: 0,
    notes: "",
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

describe("setSessionLogbooks", () => {
  it("bucht die Logbuch-AP beim Zuordnen und nimmt sie beim Lösen zurück", async () => {
    const { gm, sessionId, log } = await setup();

    await setSessionLogbooks(sessionId, [log.id], gm.id);
    expect(await logbookAp(sessionId)).toBe(1);

    await setSessionLogbooks(sessionId, [], gm.id);
    expect(await logbookAp(sessionId)).toBe(0);
  });

  it("bucht nicht doppelt, wenn dieselbe Zuordnung erneut gesetzt wird", async () => {
    const { gm, sessionId, log } = await setup();

    await setSessionLogbooks(sessionId, [log.id], gm.id);
    await setSessionLogbooks(sessionId, [log.id], gm.id);

    expect(await logbookAp(sessionId)).toBe(1);
  });

  // Ein Logbuch hängt an genau EINER Session. Wird es weitergezogen, verliert
  // die alte Session ihr letztes Logbuch — und damit ihre Gutschrift.
  it("zieht die AP der Session mit, der ein Logbuch weggenommen wird", async () => {
    const { gm, character, sessionId, log } = await setup();

    const zweiteSession = await createGameSession({
      sessionDate: "2399-01-08",
      title: "Zweite Session",
      sessionAp: 0,
      bonusAp: 0,
      notes: "",
      characterIds: [character.id],
      createdByUserId: gm.id,
    });

    await setSessionLogbooks(sessionId, [log.id], gm.id);
    expect(await logbookAp(sessionId)).toBe(1);

    await setSessionLogbooks(zweiteSession, [log.id], gm.id);

    expect(await logbookAp(zweiteSession)).toBe(1);
    expect(await logbookAp(sessionId)).toBe(0);
  });
});

describe("Logbuch-AP beim Löschen und Wiederherstellen einer Mission", () => {
  it("nimmt die Gutschrift zurück und holt sie beim Wiederherstellen zurück", async () => {
    const { gm, mission, sessionId, log } = await setup();

    await setSessionLogbooks(sessionId, [log.id], gm.id);
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

    await setSessionLogbooks(sessionId, [log.id], gm.id);
    await syncSessionLogbookAp(sessionId, gm.id);
    await syncSessionLogbookAp(sessionId, gm.id);

    expect(await logbookAp(sessionId)).toBe(1);
  });
});

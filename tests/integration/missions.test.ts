import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createMission,
  createMissionLog,
  setMissionLogVisibility,
  deleteMissionLog,
  deleteMission,
} from "@/lib/missions";
import { insertUser, insertCharacter, insertMission } from "./helpers";

function baseMissionInput(overrides: Partial<Parameters<typeof createMission>[0]> = {}) {
  return {
    slug: "test-mission",
    title: "Testmission",
    status: "active" as const,
    startedAt: null,
    endedAt: null,
    tags: [],
    teaser: null,
    bodyMarkdown: "",
    ownerUserId: 0,
    ...overrides,
  };
}

function baseLogInput(overrides: Partial<Parameters<typeof createMissionLog>[0]> = {}) {
  return {
    slug: "test-mission-log",
    missionId: 0,
    authorId: 0,
    title: "Testlog",
    bodyMarkdown: "",
    logDate: null,
    sessionNr: 1,
    tags: [],
    ownerUserId: null,
    ...overrides,
  };
}

describe("createMission", () => {
  it("creates a mission owned by the given user", async () => {
    const user = await insertUser();

    const result = await createMission(
      baseMissionInput({ slug: "erste-mission", ownerUserId: user.id }),
    );

    expect(result.slug).toBe("erste-mission");
    const [row] = await sql<{ owner_user_id: number; status: string }[]>`
      SELECT owner_user_id, status FROM missions WHERE id = ${result.id}
    `;
    expect(row.owner_user_id).toBe(user.id);
    expect(row.status).toBe("active");
  });
});

describe("createMissionLog", () => {
  it("creates a log attached to the given mission and author character", async () => {
    const user = await insertUser();
    const mission = await insertMission({ ownerUserId: user.id });
    const character = await insertCharacter({ playerId: user.id });

    const result = await createMissionLog(
      baseLogInput({ missionId: mission.id, authorId: character.id }),
    );

    const [row] = await sql<{ mission_id: number; author_id: number }[]>`
      SELECT mission_id, author_id FROM mission_logs WHERE id = ${result.id}
    `;
    expect(row.mission_id).toBe(mission.id);
    expect(row.author_id).toBe(character.id);
  });
});

describe("setMissionLogVisibility", () => {
  it("lets the author character's player change visibility", async () => {
    const author = await insertUser();
    const mission = await insertMission();
    const character = await insertCharacter({ playerId: author.id });
    const log = await createMissionLog(
      baseLogInput({ missionId: mission.id, authorId: character.id }),
    );

    const result = await setMissionLogVisibility(author.id, log.id, "gm");

    expect(result?.slug).toBe(log.slug);
    const [row] = await sql<{ visibility: string }[]>`
      SELECT visibility FROM mission_logs WHERE id = ${log.id}
    `;
    expect(row.visibility).toBe("gm");
  });

  it("does not let a different user change visibility", async () => {
    const author = await insertUser();
    const intruder = await insertUser();
    const mission = await insertMission();
    const character = await insertCharacter({ playerId: author.id });
    const log = await createMissionLog(
      baseLogInput({ missionId: mission.id, authorId: character.id }),
    );

    const result = await setMissionLogVisibility(intruder.id, log.id, "gm");

    expect(result).toBeNull();
  });
});

describe("deleteMissionLog", () => {
  it("deletes the log, its timeline event, and writes a content_deletions row", async () => {
    const author = await insertUser();
    const mission = await insertMission();
    const character = await insertCharacter({ playerId: author.id });
    const log = await createMissionLog(
      baseLogInput({
        missionId: mission.id,
        authorId: character.id,
        logDate: "2400-01-01",
      }),
    );
    await sql`
      INSERT INTO timeline_events (event_date, title, source_type, source_slug, href)
      VALUES ('2400-01-01', 'Testlog', 'mission_log', ${log.slug}, '/x')
    `;

    const result = await deleteMissionLog(author.id, log.id);

    expect(result?.slug).toBe(log.slug);
    const [[remainingLog], [remainingTimeline], [deletion]] = await Promise.all([
      sql`SELECT id FROM mission_logs WHERE id = ${log.id}`,
      sql`SELECT id FROM timeline_events WHERE source_slug = ${log.slug}`,
      sql<{ target_type: string }[]>`
        SELECT target_type FROM content_deletions WHERE title = 'Testlog'
      `,
    ]);
    expect(remainingLog).toBeUndefined();
    expect(remainingTimeline).toBeUndefined();
    expect(deletion.target_type).toBe("mission_log");
  });

  it("returns null when the requesting user is not the author's player", async () => {
    const author = await insertUser();
    const intruder = await insertUser();
    const mission = await insertMission();
    const character = await insertCharacter({ playerId: author.id });
    const log = await createMissionLog(
      baseLogInput({ missionId: mission.id, authorId: character.id }),
    );

    const result = await deleteMissionLog(intruder.id, log.id);

    expect(result).toBeNull();
    const [row] = await sql`SELECT id FROM mission_logs WHERE id = ${log.id}`;
    expect(row).toBeDefined();
  });
});

describe("deleteMission", () => {
  it("cascades to its mission_logs and writes a content_deletions row", async () => {
    const admin = await insertUser({ role: "admin" });
    const author = await insertUser();
    const mission = await insertMission({ title: "Zu löschende Mission" });
    const character = await insertCharacter({ playerId: author.id });
    const log = await createMissionLog(
      baseLogInput({ missionId: mission.id, authorId: character.id }),
    );

    const result = await deleteMission(mission.id, admin.id);

    expect(result?.logSlugs).toEqual([log.slug]);
    const [[remainingMission], [remainingLog], [deletion]] = await Promise.all([
      sql`SELECT id FROM missions WHERE id = ${mission.id}`,
      sql`SELECT id FROM mission_logs WHERE id = ${log.id}`,
      sql<{ target_type: string; deleted_by: number }[]>`
        SELECT target_type, deleted_by FROM content_deletions
        WHERE title = 'Zu löschende Mission'
      `,
    ]);
    expect(remainingMission).toBeUndefined();
    expect(remainingLog).toBeUndefined();
    expect(deletion.target_type).toBe("mission");
    expect(deletion.deleted_by).toBe(admin.id);
  });

  it("returns null for a non-existent mission id", async () => {
    const admin = await insertUser({ role: "admin" });

    const result = await deleteMission(999999, admin.id);

    expect(result).toBeNull();
  });
});

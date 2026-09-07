import { describe, it, expect, vi } from "vitest";
import sql from "@/lib/db";
import { getPendingActions, DRAFT_STALE_DAYS } from "@/lib/pendingActions";
import { insertUser, insertCharacter, insertMission } from "./helpers";

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

// Was die angemeldete Person schuldet — abgeleitet aus dem Bestand, ohne
// eigene Tabelle.

describe("getPendingActions", () => {
  it("nennt eine Mission ohne eigenes Logbuch", async () => {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "Kira", playerId: user.id });
    const mission = await insertMission({ title: "Nebel von Ceti" });
    await sql`INSERT INTO mission_participants (mission_id, character_id) VALUES (${mission.id}, ${figur.id})`;

    const actions = await getPendingActions(user.id);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      kind: "mission_log",
      subject: "Nebel von Ceti",
      label: "Logbuch schreiben",
    });
  });

  it("schweigt, sobald ein eigenes Logbuch existiert", async () => {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "Kira", playerId: user.id });
    const mission = await insertMission({ title: "Nebel von Ceti" });
    await sql`INSERT INTO mission_participants (mission_id, character_id) VALUES (${mission.id}, ${figur.id})`;
    await sql`
      INSERT INTO mission_logs (slug, mission_id, title, author_id, visibility, owner_user_id, content, metadata)
      VALUES ('mein-log', ${mission.id}, 'Mein Log', ${figur.id}, 'public', ${user.id}, '<p>x</p>', '{}')
    `;

    expect(await getPendingActions(user.id)).toHaveLength(0);
  });

  it("zählt zwei eigene Figuren in derselben Mission als eine Aufgabe", async () => {
    const user = await insertUser();
    const a = await insertCharacter({ name: "Kira", playerId: user.id });
    const b = await insertCharacter({ name: "Tuvok", playerId: user.id });
    const mission = await insertMission({ title: "Doppelt" });
    await sql`INSERT INTO mission_participants (mission_id, character_id) VALUES (${mission.id}, ${a.id}), (${mission.id}, ${b.id})`;

    expect(await getPendingActions(user.id)).toHaveLength(1);
  });

  it("meldet ein Gespräch, in dem ich am Zug bin", async () => {
    const ich = await insertUser();
    const andere = await insertUser();
    const [entry] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('plausch', 'Plausch', 'dialogue', '', '{}', '{}', NULL, 'public', TRUE, ${ich.id})
      RETURNING id
    `;
    await sql`INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md, created_at)
              VALUES (${entry.id}, ${ich.id}, '<p>Hallo</p>', 'Hallo', NOW() - INTERVAL '2 hours')`;
    await sql`INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md, created_at)
              VALUES (${entry.id}, ${andere.id}, '<p>Und?</p>', 'Und?', NOW() - INTERVAL '1 hour')`;

    const actions = await getPendingActions(ich.id);
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("dialogue_reply");
    // Die andere Seite ist NICHT am Zug — sie hat zuletzt geschrieben.
    expect(await getPendingActions(andere.id)).toHaveLength(0);
  });

  it("übergeht ein Gespräch, an dem ich gar nicht beteiligt bin", async () => {
    const ich = await insertUser();
    const andere = await insertUser();
    const [entry] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('fremd', 'Fremdes Gespräch', 'dialogue', '', '{}', '{}', NULL, 'public', TRUE, ${andere.id})
      RETURNING id
    `;
    await sql`INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md)
              VALUES (${entry.id}, ${andere.id}, '<p>Selbstgespräch</p>', 'Selbstgespräch')`;

    expect(await getPendingActions(ich.id)).toHaveLength(0);
  });

  it("erinnert an liegengebliebene eigene Entwürfe", async () => {
    const user = await insertUser();
    await sql`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, is_draft, owner_user_id, updated_at)
      VALUES ('alt', 'Alter Entwurf', 'location', '', '{}', '{}', NULL, 'public', TRUE, ${user.id},
              NOW() - ${`${DRAFT_STALE_DAYS + 1} days`}::interval)
    `;
    await sql`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, is_draft, owner_user_id, updated_at)
      VALUES ('frisch', 'Frischer Entwurf', 'location', '', '{}', '{}', NULL, 'public', TRUE, ${user.id}, NOW())
    `;

    const actions = await getPendingActions(user.id);
    // Nur der alte: ein frischer Entwurf ist Arbeit in Arbeit, keine Schuld.
    expect(actions.map((a) => a.subject)).toEqual(["Alter Entwurf"]);
  });

  it("stellt das Älteste nach oben", async () => {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "Kira", playerId: user.id });
    const alt = await insertMission({ title: "Alte Mission" });
    const neu = await insertMission({ title: "Neue Mission" });
    await sql`UPDATE missions SET started_at = '2399-01-01' WHERE id = ${alt.id}`;
    await sql`UPDATE missions SET started_at = '2402-01-01' WHERE id = ${neu.id}`;
    await sql`INSERT INTO mission_participants (mission_id, character_id)
              VALUES (${alt.id}, ${figur.id}), (${neu.id}, ${figur.id})`;

    const actions = await getPendingActions(user.id);
    expect(actions.map((a) => a.subject)).toEqual([
      "Alte Mission",
      "Neue Mission",
    ]);
  });
});

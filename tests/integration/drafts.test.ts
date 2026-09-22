import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import { getOwnDrafts } from "@/lib/drafts";
import { insertMission, insertUser } from "./helpers";

async function insertArchiveEntry(over: {
  slug: string;
  title: string;
  category?: string;
  ownerId?: number | null;
  isDraft?: boolean;
  deleted?: boolean;
  updatedAt?: string;
  dialogueOpen?: boolean;
}) {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO archive_entries
      (slug, title, category, content, owner_user_id, is_draft, deleted_at,
       updated_at, dialogue_open)
    VALUES (
      ${over.slug}, ${over.title}, ${over.category ?? "other"}, 'Text',
      ${over.ownerId ?? null}, ${over.isDraft ?? true},
      ${over.deleted ? new Date().toISOString() : null},
      ${over.updatedAt ?? new Date().toISOString()},
      ${over.dialogueOpen ?? false}
    )
    RETURNING id
  `;
  return row;
}

async function insertMissionLog(over: {
  slug: string;
  missionId: number;
  ownerId?: number | null;
  isDraft?: boolean;
  updatedAt?: string;
}) {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO mission_logs
      (slug, mission_id, title, content, owner_user_id, is_draft, updated_at)
    VALUES (
      ${over.slug}, ${over.missionId}, 'Logbuch', 'Text',
      ${over.ownerId ?? null}, ${over.isDraft ?? true},
      ${over.updatedAt ?? new Date().toISOString()}
    )
    RETURNING id
  `;
  return row;
}

describe("getOwnDrafts", () => {
  it("führt Logbuch, Datenbank-Eintrag, Gespräch und Mission", async () => {
    const user = await insertUser();
    const mission = await insertMission();

    await insertMissionLog({ slug: "log-e", missionId: mission.id, ownerId: user.id });
    await insertArchiveEntry({ slug: "eintrag-e", title: "Eintrag", ownerId: user.id });
    await insertArchiveEntry({
      slug: "gespraech-e",
      title: "Gespräch",
      category: "dialogue",
      ownerId: user.id,
    });
    await sql`
      UPDATE missions SET owner_user_id = ${user.id}, is_draft = true
      WHERE id = ${mission.id}
    `;

    const drafts = await getOwnDrafts(user.id);

    expect([...drafts.map((d) => d.kind)].sort()).toEqual([
      "archive_entry",
      "dialogue",
      "mission",
      "mission_log",
    ]);
  });

  // Der Kern: Maßgeblich ist der BESITZ, nicht die Beteiligung. Ein
  // Gesprächs-Entwurf, den jemand anderes begonnen hat, ist nicht meiner —
  // veröffentlichen darf ihn ohnehin nur sein Besitzer.
  it("zeigt keinen fremden Entwurf", async () => {
    const ich = await insertUser();
    const andere = await insertUser();

    await insertArchiveEntry({
      slug: "fremd",
      title: "Fremder Entwurf",
      ownerId: andere.id,
    });

    expect(await getOwnDrafts(ich.id)).toEqual([]);
  });

  it("zeigt nichts, was schon veröffentlicht ist", async () => {
    const user = await insertUser();
    await insertArchiveEntry({
      slug: "fertig",
      title: "Fertig",
      ownerId: user.id,
      isDraft: false,
    });

    expect(await getOwnDrafts(user.id)).toEqual([]);
  });

  // Ein gelöschter Entwurf liegt im Papierkorb, nicht auf dem Schreibtisch.
  it("zeigt nichts aus dem Papierkorb", async () => {
    const user = await insertUser();
    await insertArchiveEntry({
      slug: "geloescht",
      title: "Gelöscht",
      ownerId: user.id,
      deleted: true,
    });

    expect(await getOwnDrafts(user.id)).toEqual([]);
  });

  it("stellt das zuletzt Bearbeitete nach oben", async () => {
    const user = await insertUser();
    await insertArchiveEntry({
      slug: "alt",
      title: "Alt",
      ownerId: user.id,
      updatedAt: "2400-01-01T00:00:00Z",
    });
    await insertArchiveEntry({
      slug: "neu",
      title: "Neu",
      ownerId: user.id,
      updatedAt: "2400-06-01T00:00:00Z",
    });

    expect((await getOwnDrafts(user.id)).map((d) => d.title)).toEqual([
      "Neu",
      "Alt",
    ]);
  });

  it("führt jede Art zu ihrer eigentlichen Inhaltsseite", async () => {
    const user = await insertUser();
    const mission = await insertMission();
    const log = await insertMissionLog({
      slug: "log-ziel",
      missionId: mission.id,
      ownerId: user.id,
    });
    const eintrag = await insertArchiveEntry({
      slug: "eintrag-ziel",
      title: "Eintrag",
      ownerId: user.id,
    });
    await insertArchiveEntry({
      slug: "gespraech-ziel",
      title: "Gespräch",
      category: "dialogue",
      ownerId: user.id,
      dialogueOpen: true,
    });
    await sql`
      UPDATE missions SET owner_user_id = ${user.id}, is_draft = true
      WHERE id = ${mission.id}
    `;

    const drafts = await getOwnDrafts(user.id);
    const href = (kind: string) => drafts.find((d) => d.kind === kind)?.href;
    const editHref = (kind: string) =>
      drafts.find((d) => d.kind === kind)?.editHref;

    expect(href("mission_log")).toBe(
      `/chronologie/mission/${mission.slug}/${log.slug}`,
    );
    expect(href("archive_entry")).toBe(`/archive/${eintrag.slug}`);
    expect(href("dialogue")).toBe("/dialogues/gespraech-ziel");
    expect(href("mission")).toBe(`/chronologie/mission/${mission.slug}`);
    expect(editHref("mission_log")).toBe(
      `/user/mission-logs/${log.id}/edit`,
    );
    expect(editHref("archive_entry")).toBe(
      `/user/archive/${eintrag.id}/edit`,
    );
    expect(editHref("dialogue")).toMatch(/^\/user\/archive\/\d+\/edit$/);
    expect(editHref("mission")).toBe(`/user/missions/${mission.id}/edit`);
  });

  it("gibt für ein Konto ohne Entwürfe nichts zurück", async () => {
    const user = await insertUser();
    expect(await getOwnDrafts(user.id)).toEqual([]);
  });
});

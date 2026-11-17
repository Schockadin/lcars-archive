import { beforeEach, describe, expect, it, vi } from "vitest";

const ai = vi.hoisted(() => ({ embedTexts: vi.fn() }));
vi.mock("@/lib/embeddings", async (original) => ({
  ...(await original<typeof import("@/lib/embeddings")>()),
  generateEmbedding: async () => [1, ...Array<number>(1535).fill(0)],
  embedTexts: ai.embedTexts,
}));
import sql from "@/lib/db";
import { embedOne } from "@/lib/embeddingSync";
import { upsertEmbeddings } from "@/lib/embeddings";
import { retrieveChunks } from "@/lib/rag";
import { makeViewer } from "@/lib/visibility";
import { PUBLIC_CONTENT_INDEX_VERSION } from "@/lib/publicContent";
import { embeddingSourceFingerprint } from "@/lib/embeddingSource";
import { insertCharacter, insertMission, insertUser } from "./helpers";

const vector = [1, ...Array<number>(1535).fill(0)];

beforeEach(async () => {
  // Der polymorphe Index besitzt absichtlich keine Content-Fremdschlüssel.
  await sql`DELETE FROM content_embeddings`;
  ai.embedTexts.mockReset();
  ai.embedTexts.mockImplementation(async (texts: string[]) =>
    texts.map(() => vector),
  );
});

async function indexCharacter(
  id: number,
  metadata?: Record<string, string | number>,
) {
  const [row] = await sql<{ fingerprint: string }[]>`
    SELECT ${embeddingSourceFingerprint(sql, "character")} AS fingerprint FROM characters c WHERE id = ${id}`;
  await upsertEmbeddings(sql, {
    contentType: "character",
    contentId: id,
    chunks: [
      {
        index: 0,
        text: "Öffentlicher Sternenflotten-Bericht.",
        embedding: vector,
      },
    ],
    ownerId: null,
    isDraft: false,
    isActive: true,
    title: "Bericht",
    slug: "bericht",
    href: "/characters/bericht",
    metadata: metadata ?? {
      publicContentVersion: PUBLIC_CONTENT_INDEX_VERSION,
      sourceFingerprint: row.fingerprint,
    },
  });
}

describe("RAG autorisiert gegen aktuelle Quellen", () => {
  it("entfernt private Abschnitte vor dem HTML-Fallback für alte Log-, Archiv- und Gesprächszeilen", async () => {
    const mission = await insertMission();
    const html = "<p>Öffentliche Sternenflotte</p><!-- private -->GM-Geheimnis";
    const [log] = await sql<{ id: number }[]>`
      INSERT INTO mission_logs (slug, title, mission_id, content, source_md)
      VALUES ('legacy-log', 'Bericht', ${mission.id}, ${html}, NULL) RETURNING id
    `;
    const entries = await sql<{ id: number; category: string }[]>`
      INSERT INTO archive_entries (slug, title, category, content, source_md, dialogue_open)
      VALUES ('legacy-archiv', 'Archiv', 'location', ${html}, NULL, FALSE),
             ('legacy-gespraech', 'Gespräch', 'dialogue', ${html}, NULL, FALSE)
      RETURNING id, category
    `;
    await embedOne(sql, "mission_log", log.id);
    for (const entry of entries) {
      await embedOne(
        sql,
        entry.category === "dialogue" ? "dialogue" : "archive_entry",
        entry.id,
      );
    }
    expect(ai.embedTexts).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(ai.embedTexts.mock.calls)).not.toContain(
      "GM-Geheimnis",
    );
    expect(
      JSON.stringify(await retrieveChunks("Sternenflotte", null)),
    ).not.toContain("GM-Geheimnis");
  });
  it("behält unveränderte Logtexte bei Umbenennung ihrer Mission und Autoren im Index", async () => {
    const author = await insertCharacter({ name: "Alter Autorenname" });
    const mission = await insertMission({ title: "Alter Missionstitel" });
    const [log] = await sql<{ id: number }[]>`
      INSERT INTO mission_logs (slug, title, mission_id, author_id, content, source_md)
      VALUES ('rag-bericht', 'Bericht', ${mission.id}, ${author.id}, '<p>Sternenflotte</p>', 'Sternenflotte')
      RETURNING id
    `;
    await embedOne(sql, "mission_log", log.id);
    await sql`UPDATE missions SET title = 'Neuer Missionstitel', slug = 'neue-mission' WHERE id = ${mission.id}`;
    await sql`UPDATE characters SET name = 'Neuer Autorenname' WHERE id = ${author.id}`;
    expect(await retrieveChunks("Sternenflotte", null)).toHaveLength(1);

    await sql`UPDATE missions SET is_draft = TRUE WHERE id = ${mission.id}`;
    expect(await retrieveChunks("Sternenflotte", null)).toEqual([]);
  });
  it("liefert einen aktuellen veröffentlichten Chunk, sperrt ungeprüfte Legacy-Chunks", async () => {
    const character = await insertCharacter();
    await indexCharacter(character.id);
    expect(await retrieveChunks("Sternenflotte", null)).toHaveLength(1);
    await indexCharacter(character.id, {});
    expect(await retrieveChunks("Sternenflotte", null)).toEqual([]);
  });

  it("vertraut weder öffentlichen Index-Flags noch einem früheren Owner", async () => {
    const previousOwner = await insertUser();
    const owner = await insertUser();
    const character = await insertCharacter({
      playerId: owner.id,
      isDraft: true,
    });
    // Absichtlich falsche ACLs im Index; ausschließlich die Quellzeile zählt.
    await indexCharacter(character.id);
    expect(await retrieveChunks("Sternenflotte", null)).toEqual([]);
    expect(
      await retrieveChunks(
        "Sternenflotte",
        makeViewer(previousOwner.id, ["player"]),
      ),
    ).toEqual([]);
    expect(
      await retrieveChunks("Sternenflotte", makeViewer(owner.id, ["player"])),
    ).toHaveLength(1);
    await sql`UPDATE characters SET deleted_at = NOW() WHERE id = ${character.id}`;
    expect(
      await retrieveChunks("Sternenflotte", makeViewer(owner.id, ["admin"])),
    ).toEqual([]);
  });

  it("bleibt bei Owner-/Draft-/Wertewechseln aktuell, ohne den unveränderten Text neu zu embedden", async () => {
    const formerOwner = await insertUser();
    const owner = await insertUser();
    const character = await insertCharacter({ playerId: formerOwner.id });
    await indexCharacter(character.id);
    await sql`UPDATE characters SET player_id = ${owner.id}, is_draft = TRUE,
      metadata = '{"stats":{"stress":4}}', updated_at = NOW() WHERE id = ${character.id}`;
    expect(
      await retrieveChunks(
        "Sternenflotte",
        makeViewer(formerOwner.id, ["player"]),
      ),
    ).toEqual([]);
    expect(
      await retrieveChunks("Sternenflotte", makeViewer(owner.id, ["player"])),
    ).toHaveLength(1);
    await sql`UPDATE characters SET is_draft = FALSE, updated_at = NOW() WHERE id = ${character.id}`;
    expect(await retrieveChunks("Sternenflotte", null)).toHaveLength(1);
  });

  it("sperrt ältere Textstände auch dann, wenn die verspätete Indexzeile neuer ist", async () => {
    const character = await insertCharacter();
    await indexCharacter(character.id);
    await sql`UPDATE characters SET source_md = 'Neuer öffentlicher Stand',
      updated_at = updated_at + INTERVAL '1 second' WHERE id = ${character.id}`;
    await sql`UPDATE content_embeddings SET updated_at = NOW() + INTERVAL '1 day'`;
    expect(await retrieveChunks("Sternenflotte", null)).toEqual([]);
  });

  it("gibt bei einem Zurückziehen während des Embeddings keinen alten öffentlichen Text frei", async () => {
    const character = await insertCharacter();
    await sql`UPDATE characters SET source_md = 'Sternenflotte. <!-- private --> GM-Geheimnis'
      WHERE id = ${character.id}`;
    let release!: (vectors: number[][]) => void;
    let started!: () => void;
    const embeddingStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    ai.embedTexts.mockImplementationOnce((texts: string[]) => {
      expect(texts.join(" ")).not.toContain("GM-Geheimnis");
      started();
      return new Promise<number[][]>((resolve) => {
        release = resolve;
      });
    });
    const embedding = embedOne(sql, "character", character.id);
    await embeddingStarted;
    await sql`UPDATE characters SET is_draft = TRUE,
      updated_at = updated_at + INTERVAL '1 second' WHERE id = ${character.id}`;
    release([vector]);
    await embedding;
    expect(await retrieveChunks("Sternenflotte", null)).toEqual([]);
  });

  it("überschreibt bei verspäteter Fertigstellung keine inzwischen neu indizierten Inhalte", async () => {
    const character = await insertCharacter();
    await sql`UPDATE characters SET source_md = 'Alte vertrauliche Textfassung' WHERE id = ${character.id}`;
    let release!: (vectors: number[][]) => void;
    let started!: () => void;
    const embeddingStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    ai.embedTexts.mockImplementationOnce(() => {
      started();
      return new Promise<number[][]>((resolve) => {
        release = resolve;
      });
    });
    const oldJob = embedOne(sql, "character", character.id);
    await embeddingStarted;
    await sql`UPDATE characters SET source_md = 'Neue Sternenflotten-Textfassung' WHERE id = ${character.id}`;
    await embedOne(sql, "character", character.id);
    release([vector]);
    await oldJob;
    const chunks = await retrieveChunks("Sternenflotte", null);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkText).toContain("Neue Sternenflotten-Textfassung");
    expect(chunks[0].chunkText).not.toContain("vertrauliche");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, queries } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  queries: [] as { query: string; values: unknown[] }[],
}));

vi.mock("@/lib/db", () => ({ default: sqlMock }));

import {
  getAllAutolinkableContent,
  getOwnAutolinkableContent,
} from "./autolink";

describe("getOwnAutolinkableContent", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    queries.length = 0;
    sqlMock.mockImplementation(
      (parts: TemplateStringsArray, ...values: unknown[]) => {
        const query = Array.from(parts).join("?");
        queries.push({ query, values });
        if (query.includes("FROM characters")) {
          return Promise.resolve([
            { id: 1, slug: "eigener-charakter", source_md: "Text" },
          ]);
        }
        if (query.includes("FROM missions")) {
          return Promise.resolve(
            query.includes("NOT EXISTS")
              ? []
              : [{ id: 2, slug: "eigene-mission", source_md: "Text" }],
          );
        }
        if (query.includes("FROM mission_logs")) {
          return Promise.resolve([
            {
              id: 3,
              slug: "eigenes-log",
              mission_id: 9,
              source_md: "Text",
            },
          ]);
        }
        if (query.includes("FROM mission_synopsis_blocks")) {
          return Promise.resolve([
            {
              id: 5,
              slug: "eigene-mission",
              mission_id: 2,
              source_md: "Synopsis-Text",
            },
          ]);
        }
        if (query.includes("FROM archive_entries")) {
          return Promise.resolve([
            { id: 4, slug: "eigener-eintrag", source_md: "Text" },
          ]);
        }
        throw new Error(`Unerwartete Abfrage: ${query}`);
      },
    );
  });

  it("lädt nur eigene Markdown-Inhalte und schließt Gespräche aus", async () => {
    const content = await getOwnAutolinkableContent(42);

    expect(content.map(({ contentType, id }) => [contentType, id])).toEqual([
      ["character", 1],
      ["missionLog", 3],
      ["missionSynopsisBlock", 5],
      ["archiveEntry", 4],
    ]);
    expect(content[2]).toMatchObject({
      slug: "eigene-mission",
      missionId: 2,
      sourceMd: "Synopsis-Text",
    });
    expect(queries).toHaveLength(5);
    expect(queries[0].values).toEqual([42]);
    expect(queries[1].values).toEqual([42]);
    expect(queries[2].values).toEqual([42]);
    expect(queries[3].values).toEqual([42]);
    expect(queries[4].values).toEqual([42]);

    expect(queries[0].query).toContain("player_id = ?");
    expect(queries[1].query).toContain("owner_user_id = ?");
    expect(queries[1].query).toContain("NOT EXISTS");
    expect(queries[2].query).toContain("owner_user_id = ?");
    expect(queries[3].query).toContain(
      "COALESCE(s.created_by, m.owner_user_id) = ?",
    );
    expect(queries[4].query).toContain("owner_user_id = ?");
    expect(queries[4].query).toContain("category <> 'dialogue'");
    for (const { query } of [...queries.slice(0, 3), queries[4]]) {
      expect(query).toContain("source_md IS NOT NULL");
      expect(query).toContain("deleted_at IS NULL");
    }
    expect(queries[3].query).toContain("m.deleted_at IS NULL");
  });

  it("lädt Synopsis-Blöcke auch für den globalen Batch mit ihrer Mission", async () => {
    const content = await getAllAutolinkableContent();

    expect(
      content.find(({ contentType }) => contentType === "missionSynopsisBlock"),
    ).toMatchObject({
      id: 5,
      slug: "eigene-mission",
      missionId: 2,
      sourceMd: "Synopsis-Text",
    });
    expect(content.some(({ contentType }) => contentType === "mission")).toBe(
      false,
    );
    expect(queries).toHaveLength(5);
    expect(queries[3].query).toContain("FROM mission_synopsis_blocks b");
    expect(queries[3].query).toContain(
      "JOIN missions m ON m.id = b.mission_id",
    );
  });
});

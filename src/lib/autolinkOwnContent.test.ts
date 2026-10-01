import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, queries } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  queries: [] as { query: string; values: unknown[] }[],
}));

vi.mock("@/lib/db", () => ({ default: sqlMock }));

import { getOwnAutolinkableContent } from "./autolink";

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
          return Promise.resolve([
            { id: 2, slug: "eigene-mission", source_md: "Text" },
          ]);
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
      ["mission", 2],
      ["missionLog", 3],
      ["archiveEntry", 4],
    ]);
    expect(queries).toHaveLength(4);
    expect(queries.map(({ values }) => values)).toEqual([[42], [42], [42], [42]]);

    expect(queries[0].query).toContain("player_id = ?");
    expect(queries[1].query).toContain("owner_user_id = ?");
    expect(queries[2].query).toContain("owner_user_id = ?");
    expect(queries[3].query).toContain("owner_user_id = ?");
    expect(queries[3].query).toContain("category <> 'dialogue'");
    for (const { query } of queries) {
      expect(query).toContain("source_md IS NOT NULL");
      expect(query).toContain("deleted_at IS NULL");
    }
  });
});

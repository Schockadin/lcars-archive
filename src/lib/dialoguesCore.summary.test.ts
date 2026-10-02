import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, queries, getCharactersForUser } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  queries: [] as { query: string; values: unknown[] }[],
  getCharactersForUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: sqlMock }));
vi.mock("@/lib/characters", () => ({ getCharactersForUser }));
vi.mock("@/lib/archive", () => ({ generateUniqueArchiveEntrySlug: vi.fn() }));
vi.mock("@/lib/markdown", () => ({ markdownToSafeHtml: vi.fn() }));
vi.mock("@/lib/embeddingSync", () => ({
  syncEmbeddings: vi.fn(),
  syncEmbeddingDraft: vi.fn(),
  syncEmbeddingActive: vi.fn(),
}));
vi.mock("@/lib/characterColor", () => ({
  NPC_COLOR: "#999999",
  resolveCharacterColor: vi.fn(() => "#999999"),
}));

import {
  getAllOpenDialoguesForGM,
  getDialoguesForUser,
} from "./dialoguesCore";

const ownDialogueRow = {
  id: 20,
  slug: "kantine",
  title: "Abend in der Kantine",
  metadata: {
    participants: [
      { slug: "tuvok", name: "Tuvok" },
      { slug: "kira", name: "Kira" },
    ],
  },
  updated_at: "2400-05-02T12:00:00Z",
  last_message_character_name: "Kira",
  dialogue_open: true,
  is_draft: false,
  owner_user_id: 7,
};

beforeEach(() => {
  sqlMock.mockReset();
  queries.length = 0;
  getCharactersForUser.mockReset();
});

describe("conversation summary last-message authors", () => {
  it("loads the author for participant and NPC conversations without message text", async () => {
    getCharactersForUser.mockResolvedValue([{ slug: "tuvok", name: "Tuvok" }]);
    sqlMock.mockImplementation(
      (parts: TemplateStringsArray, ...values: unknown[]) => {
        const query = Array.from(parts).join("?");
        queries.push({ query, values });
        if (query.includes("FROM dialogue_npc_speakers")) {
          return Promise.resolve([
            {
              id: 21,
              slug: "npc-dialogue",
              title: "Mit dem Captain",
              metadata: {
                participants: [
                  { slug: "tuvok", name: "Tuvok" },
                  { slug: "mugato", name: "Mugato" },
                ],
              },
              updated_at: "2400-05-03T12:00:00Z",
              last_message_character_name: "Mugato",
              dialogue_open: true,
              is_draft: false,
              owner_user_id: 7,
              character_slug: "mugato",
              character_name: "Mugato",
            },
          ]);
        }
        return Promise.resolve([ownDialogueRow]);
      },
    );

    const summaries = await getDialoguesForUser(7, "open");

    expect(summaries.find((item) => item.slug === "kantine"))
      .toMatchObject({ lastMessageCharacterName: "Kira" });
    expect(summaries.find((item) => item.slug === "npc-dialogue"))
      .toMatchObject({ lastMessageCharacterName: "Mugato" });
    expect(queries).toHaveLength(2);
    for (const { query } of queries) {
      expect(query).toContain("LEFT JOIN LATERAL");
      expect(query).toContain("ORDER BY dm.created_at DESC, dm.id DESC");
      expect(query).toContain("COALESCE(c.name, npc.title) AS character_name");
      expect(query).toContain("dm.character_id");
      expect(query).toContain("dm.npc_entry_id");
      expect(query).not.toContain("author_user_id");
      expect(query).not.toContain("dm.content");
    }
  });

  it("lädt den Autor auch für die offene Übersicht der Spielleitung", async () => {
    sqlMock.mockImplementation(
      (parts: TemplateStringsArray, ...values: unknown[]) => {
        queries.push({ query: Array.from(parts).join("?"), values });
        return Promise.resolve([
          {
            id: 20,
            slug: "kantine",
            title: "Abend in der Kantine",
            metadata: ownDialogueRow.metadata,
            updated_at: ownDialogueRow.updated_at,
            last_message_character_name: "Kira",
            owner_name: "Quark",
          },
        ]);
      },
    );

    const [summary] = await getAllOpenDialoguesForGM();

    expect(summary.lastMessageCharacterName).toBe("Kira");
    expect(queries[0].query).toContain("LEFT JOIN LATERAL");
    expect(queries[0].query).toContain("dm.character_id");
    expect(queries[0].query).toContain("dm.npc_entry_id");
    expect(queries[0].query).not.toContain("dm.content");
  });
});

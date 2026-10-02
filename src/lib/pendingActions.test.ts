import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, queries } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  queries: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: sqlMock }));
vi.mock("@/lib/contentRoutes", () => ({
  archiveHref: (slug: string) => `/archive/${slug}`,
  dialogueContentHref: (slug: string) => `/dialogues/${slug}`,
  missionHref: (slug: string) => `/missions/${slug}`,
}));

import { getPendingActions } from "./pendingActions";

beforeEach(() => {
  sqlMock.mockReset();
  queries.length = 0;
});

describe("pending dialogue reply action", () => {
  it("returns the last speaker character, not the account name", async () => {
    sqlMock.mockImplementation((parts: TemplateStringsArray) => {
      const query = Array.from(parts).join("?");
      queries.push(query);
      if (query.includes("WITH letzte AS")) {
        return Promise.resolve([
          {
            slug: "auf-der-station",
            title: "Auf der Station",
            open: true,
            since: "2400-05-02T12:00:00Z",
            last_message_character_name: "Kira",
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const actions = await getPendingActions(7);
    const reply = actions.find((action) => action.kind === "dialogue_reply");

    expect(reply?.lastMessageCharacterName).toBe("Kira");
    const dialogueQuery = queries.find((query) =>
      query.includes("WITH letzte AS"),
    );
    expect(dialogueQuery).toContain(
      "COALESCE(last_character.name, last_npc.title) AS last_message_character_name",
    );
    expect(dialogueQuery).toContain("letzte.character_id");
    expect(dialogueQuery).toContain("letzte.npc_entry_id");
    expect(dialogueQuery).not.toContain("last_author");
  });
});

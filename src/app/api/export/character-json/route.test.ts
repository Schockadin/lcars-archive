import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import type { OwnCharacterForEdit } from "@/lib/characters";
import { getOwnCharacterForEdit, getOwnCharacterStats } from "@/lib/characters";
import { verifySession } from "@/lib/dal";
import { GET } from "./route";

vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/characters", () => ({
  getOwnCharacterForEdit: vi.fn(),
  getOwnCharacterStats: vi.fn(),
}));

const character = {
  id: 4,
  slug: "t-vel",
  name: "T'Vel",
  status: "active" as const,
  portrait: null,
  portraitSource: null,
  portraitCrop: null,
  sourceMarkdown: "Biografie",
  bioHtml: "<p>Biografie</p>",
  isDraft: false,
  npcSlug: null,
  rank: "Lieutenant",
  species: ["Vulkanier"],
  homeworld: "Vulkan",
  aliases: [],
  age: 32,
  dateOfBirth: null,
  generation: [],
  factions: [],
  ships: [],
  division: null,
  tags: [],
} satisfies OwnCharacterForEdit;

describe("GET /api/export/character-json", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySession).mockResolvedValue({ userId: 12 } as never);
    vi.mocked(getOwnCharacterForEdit).mockResolvedValue(character);
    vi.mocked(getOwnCharacterStats).mockResolvedValue({
      id: 4,
      slug: "t-vel",
      name: "T'Vel",
      portrait: null,
      portraitCrop: { zoom: 1, x: 50, y: 50 },
      species: "Vulkanier",
      rank: "Lieutenant",
      stats: EMPTY_CHARACTER_STATS,
    });
  });

  it("liefert die versionierte JSON-Datei ohne Kontokennung oder Anhänge", async () => {
    const response = await GET(new Request("https://example.test/api/export/character-json?characterId=4"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const file = await response.json();
    expect(file).toMatchObject({
      format: "lcars-archive.character",
      version: 1,
      character: { name: "T'Vel", bodyMarkdown: "Biografie" },
    });
    expect(JSON.stringify(file)).not.toContain("player_id");
    expect(JSON.stringify(file)).not.toContain("documents");
  });

  it("gibt fremde oder umgewandelte Charaktere nicht heraus", async () => {
    vi.mocked(getOwnCharacterForEdit).mockResolvedValue(null);
    vi.mocked(getOwnCharacterStats).mockResolvedValue(null);

    const response = await GET(new Request("https://example.test/api/export/character-json?characterId=9"));
    expect(response.status).toBe(404);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getCharacterPortraitThumbnailBytes } from "@/lib/characterPortraitThumbnails";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), canView: vi.fn() }));
vi.mock("@/lib/db", () => ({ default: mocks.sql }));
vi.mock("@/lib/visibility", () => ({
  getViewer: vi.fn(async () => null),
  canView: mocks.canView,
}));
vi.mock("@/lib/characterPortraitThumbnails", () => ({
  getCharacterPortraitThumbnailBytes: vi.fn(),
}));

const file = "01234567-89ab-cdef-0123-456789abcdef.png";
const key = `character-portraits/${file}`;
const src = `https://assets.example.test/${key}`;
const params = { params: Promise.resolve({ slug: "tuvok" }) };
const url = `https://example.test/api/characters/tuvok/portrait-thumbnail?image=${file}`;

describe("Portrait-Thumbnails", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("R2_ASSET_PUBLIC_BASE_URL", "https://assets.example.test");
    mocks.sql.mockResolvedValue([
      { portrait: src, metadata: null, is_draft: false, player_id: 7 },
    ]);
    mocks.canView.mockReturnValue(true);
    vi.mocked(getCharacterPortraitThumbnailBytes).mockResolvedValue(
      new Uint8Array([1, 2]),
    );
  });

  it("holt ausschließlich den aus der Datenbank validierten eigenen Objekt-Key", async () => {
    const response = await GET(new Request(url), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(getCharacterPortraitThumbnailBytes).toHaveBeenCalledExactlyOnceWith(
      key,
    );
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2]);
  });

  it("verweigert anonyme Entwürfe auch vor einer bedingten Cacheantwort", async () => {
    mocks.canView.mockReturnValue(false);
    const response = await GET(
      new Request(url, {
        headers: { "If-None-Match": `"portrait-thumb-${file}-webp-v1"` },
      }),
      params,
    );
    expect(response.status).toBe(404);
    expect(getCharacterPortraitThumbnailBytes).not.toHaveBeenCalled();
  });

  it("akzeptiert weder eine fremde Bildadresse noch einen anderen Objekt-Key aus der Query", async () => {
    mocks.sql.mockResolvedValue([
      {
        portrait: `https://evil.test/${key}`,
        metadata: null,
        is_draft: false,
        player_id: 7,
      },
    ]);
    expect((await GET(new Request(url), params)).status).toBe(404);
    mocks.sql.mockResolvedValue([
      { portrait: src, metadata: null, is_draft: false, player_id: 7 },
    ]);
    expect((await GET(new Request(`${url}-other`), params)).status).toBe(404);
    expect(getCharacterPortraitThumbnailBytes).not.toHaveBeenCalled();
  });

  it("beachtet Portrait-Original und liefert Entwürfe mit no-store", async () => {
    mocks.sql.mockResolvedValue([
      {
        portrait: "data:image/png;base64,AA==",
        portrait_source: src,
        is_draft: true,
        player_id: 7,
      },
    ]);
    const response = await GET(new Request(url), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});

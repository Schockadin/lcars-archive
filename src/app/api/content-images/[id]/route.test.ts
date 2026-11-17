import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import {
  getContentImageForServing,
  getContentAccessContext,
  canViewContentImage,
  getContentImageBytesByStorageKey,
  getContentImageThumbnailBytes,
} from "@/lib/contentImages";
import { getViewer } from "@/lib/visibility";

vi.mock("@/lib/contentImages", () => ({
  getContentImageForServing: vi.fn(),
  getContentAccessContext: vi.fn(),
  canViewContentImage: vi.fn(),
  getContentImageBytesByStorageKey: vi.fn(),
  getContentImageThumbnailBytes: vi.fn(),
}));
vi.mock("@/lib/visibility", () => ({ getViewer: vi.fn() }));

const params = { params: Promise.resolve({ id: "7" }) };
const url = "https://example.test/api/content-images/7";
const storageKey =
  "content-images/character/3/11111111-1111-4111-8111-111111111111.png";

describe("Content-Bildvarianten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getViewer).mockResolvedValue(null);
    vi.mocked(getContentImageForServing).mockResolvedValue({
      image: {
        id: 7,
        contentType: "character",
        contentId: 3,
        contentMime: "image/png",
      },
      storageKey,
    } as never);
    vi.mocked(getContentAccessContext).mockResolvedValue({
      isDraft: false,
      ownerId: 2,
    });
    vi.mocked(canViewContentImage).mockReturnValue(true);
    vi.mocked(getContentImageBytesByStorageKey).mockResolvedValue({
      body: Buffer.from("original"),
      contentType: "image/png",
    });
    vi.mocked(getContentImageThumbnailBytes).mockResolvedValue(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("liefert die kleine Variante und einen anderen ETag als das Original", async () => {
    const thumbnail = await GET(new Request(`${url}?width=156`), params);
    const original = await GET(new Request(url), params);
    expect(thumbnail.status).toBe(200);
    expect(thumbnail.headers.get("content-type")).toBe("image/webp");
    expect(thumbnail.headers.get("etag")).not.toBe(
      original.headers.get("etag"),
    );
    expect(thumbnail.headers.get("vary")).toBe("Cookie");
    expect([...new Uint8Array(await thumbnail.arrayBuffer())]).toEqual([
      1, 2, 3,
    ]);
    expect(await original.text()).toBe("original");
    expect(getContentImageThumbnailBytes).toHaveBeenCalledExactlyOnceWith(
      storageKey,
    );
  });

  it("prüft Sichtbarkeit auch bei passendem Thumbnail-ETag vor jeglichem Bytezugriff", async () => {
    vi.mocked(canViewContentImage).mockReturnValue(false);
    const response = await GET(
      new Request(`${url}?width=156`, {
        headers: { "If-None-Match": '"content-image-7-thumb-156-webp-v1"' },
      }),
      params,
    );
    expect(response.status).toBe(404);
    expect(canViewContentImage).toHaveBeenCalledWith(
      "character",
      { isDraft: false, ownerId: 2 },
      null,
    );
    expect(getContentImageThumbnailBytes).not.toHaveBeenCalled();
    expect(getContentImageBytesByStorageKey).not.toHaveBeenCalled();
  });

  it("spart bei einem erlaubten bedingten Request R2 und Bildverarbeitung", async () => {
    const first = await GET(new Request(`${url}?width=156`), params);
    vi.mocked(getContentImageThumbnailBytes).mockClear();
    const response = await GET(
      new Request(`${url}?width=156`, {
        headers: { "If-None-Match": first.headers.get("etag")! },
      }),
      params,
    );
    expect(response.status).toBe(304);
    expect(getContentImageThumbnailBytes).not.toHaveBeenCalled();
    expect(getContentImageBytesByStorageKey).not.toHaveBeenCalled();
  });

  it("verwendet bei wiederhergestellter ID den neuen Objekt-Key statt alter Cachebytes oder Validatoren", async () => {
    const restoredKey =
      "content-images/character/8/22222222-2222-4222-8222-222222222222.png";
    const cachedBytes = new Map([
      [storageKey, new Uint8Array([11])],
      [restoredKey, new Uint8Array([22])],
    ]);
    vi.mocked(getContentImageThumbnailBytes).mockImplementation(
      async (key) => cachedBytes.get(key) ?? null,
    );
    const old = await GET(new Request(`${url}?width=156`), params);
    expect([...new Uint8Array(await old.arrayBuffer())]).toEqual([11]);

    // Ein Restore hat dieselbe numerische ID einer anderen öffentlichen
    // Inhaltszeile und einem anderen unveränderlichen S3-Objekt zugeordnet.
    vi.mocked(getContentImageForServing).mockResolvedValue({
      image: {
        id: 7,
        contentType: "character",
        contentId: 8,
        contentMime: "image/png",
      },
      storageKey: restoredKey,
    } as never);
    const restored = await GET(
      new Request(`${url}?width=156`, {
        headers: { "If-None-Match": old.headers.get("etag")! },
      }),
      params,
    );
    expect(restored.status).toBe(200);
    expect([...new Uint8Array(await restored.arrayBuffer())]).toEqual([22]);
    expect(restored.headers.get("etag")).not.toBe(old.headers.get("etag"));
    expect(restored.headers.get("etag")).not.toContain(restoredKey);
    expect(getContentAccessContext).toHaveBeenLastCalledWith("character", 8);
    expect(getContentImageThumbnailBytes).toHaveBeenLastCalledWith(restoredKey);
  });

  it("speichert Entwurfsbilder nicht im HTTP-Cache", async () => {
    vi.mocked(getContentAccessContext).mockResolvedValue({
      isDraft: true,
      ownerId: 2,
    });
    const response = await GET(new Request(`${url}?width=156`), params);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("verweigert beliebige Ausgabegrößen und fängt defekte Bilder ab", async () => {
    const invalid = await GET(new Request(`${url}?width=100000`), params);
    expect(invalid.status).toBe(400);
    expect(getContentImageForServing).not.toHaveBeenCalled();
    vi.mocked(getContentImageThumbnailBytes).mockRejectedValue(
      new Error("decoder"),
    );
    const corrupt = await GET(new Request(`${url}?width=156`), params);
    expect(corrupt.status).toBe(422);
    expect(await corrupt.text()).not.toContain("decoder");
  });
});

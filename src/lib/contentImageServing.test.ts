import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  asset: vi.fn(),
  backup: vi.fn(),
  thumbnail: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ default: mocks.sql }));
// Der Serving-Test liest keinen Viewer. Den User-Zweig der Visibility-
// Abhängigkeit isolieren, damit dessen ORM keinen echten Postgres-Client
// aus dem bewusst schmalen SQL-Mock initialisiert.
vi.mock("@/lib/users", () => ({ getUserById: vi.fn() }));
vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
}));
vi.mock("@/lib/r2Backup", () => ({
  getAssetObjectBytesFromR2: mocks.asset,
  getObjectBytesFromR2: mocks.backup,
  deleteObjectFromR2: vi.fn(),
  uploadAssetObjectToR2: vi.fn(),
  deleteAssetObjectFromR2: vi.fn(),
}));
vi.mock("@/lib/imageThumbnailBytes", () => ({
  imageThumbnailBytes: mocks.thumbnail,
}));

import { cacheTags } from "./cacheTags";
import {
  getContentImageById,
  getContentImageForServing,
  getContentImageThumbnailBytes,
} from "./contentImages";

const row = {
  id: 7,
  content_type: "character",
  content_id: 3,
  r2_key: "content-images/character/3/source.png",
  content_mime: "image/png",
  size_bytes: 20,
  uploaded_by: 2,
  created_at: "2026-11-17T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sql.mockResolvedValue([row]);
  mocks.asset.mockResolvedValue({
    body: Buffer.from("image"),
    contentType: "image/png",
  });
  mocks.backup.mockResolvedValue(null);
  mocks.thumbnail.mockResolvedValue(new Uint8Array([1, 2]));
});

describe("serverseitige Bildidentität", () => {
  it("liest Metadaten und Key gemeinsam, ohne den Key in den Browser-DTO zu geben", async () => {
    const serving = await getContentImageForServing(7);
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(serving?.storageKey).toBe(row.r2_key);
    expect(serving?.image).toMatchObject({
      id: 7,
      contentId: 3,
      contentMime: "image/png",
    });
    expect(serving?.image).not.toHaveProperty("r2_key");
    expect(await getContentImageById(7)).not.toHaveProperty("storageKey");
  });

  it("bindet die Bildvariante an den übergebenen Objekt-Key und den Restore-Tag", async () => {
    const bytes = await getContentImageThumbnailBytes(row.r2_key);
    expect(bytes).toEqual(new Uint8Array([1, 2]));
    expect(mocks.sql).not.toHaveBeenCalled();
    expect(mocks.asset).toHaveBeenCalledExactlyOnceWith(row.r2_key);
    expect(mocks.cacheTag).toHaveBeenCalledWith(cacheTags.contentImages);
  });

  it("hält fehlende Objekte nur kurz vor und lässt sie per Restore-Tag invalidieren", async () => {
    mocks.asset.mockResolvedValue(null);
    expect(await getContentImageThumbnailBytes(row.r2_key)).toBeNull();
    expect(mocks.backup).toHaveBeenCalledWith(row.r2_key);
    expect(mocks.thumbnail).not.toHaveBeenCalled();
    expect(mocks.cacheLife).toHaveBeenLastCalledWith("seconds");
    expect(mocks.cacheTag).toHaveBeenCalledWith(cacheTags.contentImages);
  });
});

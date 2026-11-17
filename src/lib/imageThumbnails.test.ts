import { describe, expect, it } from "vitest";
import { cardThumbnailSrc, ownPortraitAssetKey } from "./imageThumbnails";

const key = "character-portraits/01234567-89ab-cdef-0123-456789abcdef.png";
const base = "https://assets.example.test/archive";

describe("Karten-Thumbnails", () => {
  it("fordert nur für lokale Content-Bild-IDs die kleine Variante an", () => {
    expect(cardThumbnailSrc("/api/content-images/7")).toBe(
      "/api/content-images/7?width=156",
    );
    for (const src of [
      "https://other.test/p.png",
      "/icons/icon.png",
      "data:image/png;base64,AA==",
      "/api/content-images/0",
    ]) {
      expect(cardThumbnailSrc(src)).toBe(src);
    }
  });

  it("erkennt eigene Portraits auch unter einer Basis mit Pfad", () => {
    expect(ownPortraitAssetKey(`${base}/${key}`, `${base}/`)).toBe(key);
    expect(
      ownPortraitAssetKey(
        `https://assets.example.test/${key}`,
        "https://assets.example.test",
      ),
    ).toBe(key);
  });

  it("verweigert fremde Origins, andere Buckets, Pfadtricks und nicht bekannte Keys", () => {
    for (const src of [
      `https://other.test/archive/${key}`,
      `https://assets.example.test/elsewhere/${key}`,
      `${base}/content-images/1/a.png`,
      `${base}/character-portraits/not-a-uuid.png`,
      `${base}/character-portraits/%2e%2e/private.png`,
      `https://user:pass@assets.example.test/archive/${key}`,
      "http://127.0.0.1/internal",
    ])
      expect(ownPortraitAssetKey(src, base)).toBeNull();
    expect(ownPortraitAssetKey(`${base}/${key}`, undefined)).toBeNull();
  });
});

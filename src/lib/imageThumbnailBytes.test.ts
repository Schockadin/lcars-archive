import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { imageThumbnailBytes } from "./imageThumbnailBytes";

describe("Bild-Thumbnail", () => {
  it("liefert kleine WebP-Bytes mit erhaltener Transparenz statt des Originals", async () => {
    const original = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 20, g: 40, b: 60, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const thumbnail = await imageThumbnailBytes(original);
    const metadata = await sharp(thumbnail).metadata();
    expect(metadata).toMatchObject({
      format: "webp",
      width: 156,
      height: 104,
      hasAlpha: true,
    });
    expect(thumbnail.byteLength).toBeLessThan(original.byteLength);
  });

  it("vergrößert kleine Quellen nicht", async () => {
    const original = await sharp({
      create: { width: 20, height: 30, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    expect(
      await sharp(await imageThumbnailBytes(original)).metadata(),
    ).toMatchObject({ width: 20, height: 30 });
  });

  it("verweigert leere, übergroße oder nicht decodierbare Quellen", async () => {
    await expect(imageThumbnailBytes(Buffer.alloc(0))).rejects.toThrow();
    await expect(
      imageThumbnailBytes(Buffer.alloc(5 * 1024 * 1024 + 1)),
    ).rejects.toThrow();
    await expect(
      imageThumbnailBytes(Buffer.from("<script>alert(1)</script>")),
    ).rejects.toThrow();
  });
});

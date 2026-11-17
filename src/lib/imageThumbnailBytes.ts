import "server-only";
import { CARD_THUMBNAIL_WIDTH } from "@/lib/imageThumbnails";
import { MAX_ASSET_IMAGE_BYTES } from "@/lib/assetStorage";

// Nur eine feste Variante: weder beliebige Ausgabegrößen noch Animationen
// oder riesige, stark komprimierte Pixel-Flächen erlauben ungebremste Arbeit.
export async function imageThumbnailBytes(body: Buffer): Promise<Uint8Array> {
  if (body.byteLength === 0 || body.byteLength > MAX_ASSET_IMAGE_BYTES) {
    throw new Error("Ungültige Bildgröße.");
  }
  // Charakterlisten importieren nur die Adresshelfer. Den nativen Decoder
  // erst laden, wenn tatsächlich eine erlaubte Bildvariante angefragt wird.
  const { default: sharp } = await import("sharp");
  const result = await sharp(body, {
    animated: false,
    limitInputPixels: 32 * 1024 * 1024,
    failOn: "error",
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width: CARD_THUMBNAIL_WIDTH,
      height: CARD_THUMBNAIL_WIDTH * 2,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 76, effort: 3 })
    .timeout({ seconds: 3 })
    .toBuffer();
  return new Uint8Array(result);
}

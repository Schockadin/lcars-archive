import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cacheTags";
import { getAssetObjectBytesFromR2 } from "@/lib/r2Backup";
import { ownPortraitAssetKey } from "@/lib/imageThumbnails";
import { imageThumbnailBytes } from "@/lib/imageThumbnailBytes";

export function characterPortraitThumbnailSrc(
  slug: string,
  src: string,
): string {
  const key = ownPortraitAssetKey(src, process.env.R2_ASSET_PUBLIC_BASE_URL);
  if (!key) return src;
  // Neuer Upload = neuer Key = neue Browser-Cache-Adresse.
  return `/api/characters/${encodeURIComponent(slug)}/portrait-thumbnail?image=${encodeURIComponent(key.split("/")[1])}`;
}

// Nur vom autorisierten Route Handler mit einem aus der DB gelesenen und
// validierten Key aufrufen. Der Getter kann ausschließlich den Asset-Bucket
// lesen, niemals eine vom Browser gelieferte Adresse abrufen.
export async function getCharacterPortraitThumbnailBytes(
  key: string,
): Promise<Uint8Array | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.contentImages);
  if (!/^character-portraits\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif)$/i.test(key))
    return null;
  const object = await getAssetObjectBytesFromR2(key);
  if (!object) cacheLife("seconds");
  return object ? imageThumbnailBytes(object.body) : null;
}

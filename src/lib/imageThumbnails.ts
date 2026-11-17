// Gemeinsame, browserfähige Adresslogik; niemals eine fremde URL serverseitig
// laden, nur bekannte Content-IDs bzw. eigene R2-Portrait-Keys verwenden.
export const CARD_THUMBNAIL_WIDTH = 156;

export function cardThumbnailSrc(src: string): string {
  if (/^\/api\/content-images\/[1-9]\d*$/.test(src)) {
    return `${src}?width=${CARD_THUMBNAIL_WIDTH}`;
  }
  return src;
}

export function ownPortraitAssetKey(
  portrait: string,
  assetBaseUrl: string | undefined,
): string | null {
  if (!assetBaseUrl) return null;
  try {
    const base = new URL(assetBaseUrl);
    const image = new URL(portrait);
    if (
      !["https:", "http:"].includes(base.protocol) ||
      image.origin !== base.origin ||
      image.username ||
      image.password
    )
      return null;
    const prefix = `${base.pathname.replace(/\/+$/, "")}/`;
    if (!image.pathname.startsWith(prefix)) return null;
    const key = image.pathname.slice(prefix.length);
    return /^character-portraits\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|gif)$/i.test(
      key,
    )
      ? key
      : null;
  } catch {
    return null;
  }
}

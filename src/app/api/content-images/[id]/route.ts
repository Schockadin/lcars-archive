// Liefert die Bytes eines hochgeladenen Bildes (src/lib/contentImages.ts)
// über die DB-ID statt des rohen R2-Keys — der Bucket bleibt dadurch privat
// (kein öffentlicher Bucket/Custom-Domain nötig), gleiche Sichtbarkeits-
// prüfung wie die jeweilige Detailseite selbst (canView, siehe
// contentExport.ts). <img src="/api/content-images/{id}"> statt next/image,
// da die Bilder aus derselben Origin kommen (kein images.remotePatterns
// nötig) und die Anzahl pro Inhalt klein bleibt.
import { getViewer } from "@/lib/visibility";
import { CARD_THUMBNAIL_WIDTH } from "@/lib/imageThumbnails";
import {
  getContentImageById,
  getContentAccessContext,
  getContentImageBytes,
  getContentImageThumbnailBytes,
  canViewContentImage,
} from "@/lib/contentImages";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return new Response("Ungültiges Bild.", { status: 400 });
  }
  const width = new URL(request.url).searchParams.get("width");
  if (width !== null && width !== String(CARD_THUMBNAIL_WIDTH)) {
    return new Response("Ungültige Vorschaubildgröße.", { status: 400 });
  }
  const thumbnail = width !== null;

  const image = await getContentImageById(id);
  if (!image) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }

  const access = await getContentAccessContext(
    image.contentType,
    image.contentId,
  );
  if (!access) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }

  const viewer = await getViewer();
  if (!canViewContentImage(image.contentType, access, viewer)) {
    return new Response("Kein Zugriff.", { status: 404 });
  }

  // Die Bytes zu einer Bild-ID sind unveränderlich (ein neuer Upload bekommt
  // eine neue Zeile/ID, siehe buildContentImageKey in contentImages.ts) — die
  // ID taugt daher als stabiler, starker ETag. Die Sichtbarkeitsprüfung oben
  // ist bereits erfolgt; passt der If-None-Match-Wert des Browsers, sparen wir
  // uns den R2-Fetch komplett und antworten mit 304. `immutable` verhindert
  // zusätzlich unnötige Revalidierungen innerhalb der max-age-Spanne.
  const etag = `"content-image-${id}${thumbnail ? "-thumb-156-webp-v1" : ""}"`;
  const cacheControl =
    access.isDraft || access.parentIsDraft
      ? "private, no-store"
      : "private, max-age=3600, immutable";
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl, Vary: "Cookie" },
    });
  }

  if (thumbnail) {
    try {
      const body = await getContentImageThumbnailBytes(id);
      if (!body) return new Response("Bild nicht gefunden.", { status: 404 });
      return new Response(new Uint8Array(body), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": cacheControl,
          ETag: etag,
          Vary: "Cookie",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response(
        "Das Bild kann nicht als Vorschau verarbeitet werden.",
        { status: 422 },
      );
    }
  }

  const object = await getContentImageBytes(id);
  if (!object) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": cacheControl,
      ETag: etag,
      Vary: "Cookie",
    },
  });
}

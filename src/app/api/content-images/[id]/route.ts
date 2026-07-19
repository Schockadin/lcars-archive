// Liefert die Bytes eines hochgeladenen Bildes (src/lib/contentImages.ts)
// über die DB-ID statt des rohen R2-Keys — der Bucket bleibt dadurch privat
// (kein öffentlicher Bucket/Custom-Domain nötig), gleiche Sichtbarkeits-
// prüfung wie die jeweilige Detailseite selbst (canView, siehe
// contentExport.ts). <img src="/api/content-images/{id}"> statt next/image,
// da die Bilder aus derselben Origin kommen (kein images.remotePatterns
// nötig) und die Anzahl pro Inhalt klein bleibt.
import { getViewer, canView } from "@/lib/visibility";
import {
  getContentImageById,
  getContentAccessContext,
  getContentImageBytes,
} from "@/lib/contentImages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return new Response("Ungültiges Bild.", { status: 400 });
  }

  const image = await getContentImageById(id);
  if (!image) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }

  const access = await getContentAccessContext(image.contentType, image.contentId);
  if (!access) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }

  const viewer = await getViewer();
  if (!canView(access.visibility, access.ownerId, viewer)) {
    return new Response("Kein Zugriff.", { status: 404 });
  }

  const object = await getContentImageBytes(id);
  if (!object) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

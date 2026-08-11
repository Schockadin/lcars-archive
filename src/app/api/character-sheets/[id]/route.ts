// Liefert die Bytes eines Charakterbogens (PDF) über die DB-ID statt einer
// öffentlichen Bucket-URL — der Asset-Bucket bleibt privat (der r2_key wird
// nie an den Client gegeben), und die Auslieferung hängt nicht an einer
// korrekt konfigurierten öffentlichen Asset-Domain. Sichtbarkeitsprüfung wie
// die Charakterseite selbst (canView + canViewDraft auf dem zugehörigen
// Charakter). Gleiches Muster wie /api/content-images/[id].
//
// Standard: inline (Content-Disposition inline) — dadurch kann der Browser
// bzw. der eingebettete Viewer (CharacterSheets.tsx) das PDF direkt anzeigen.
// Mit ?download=1 wird stattdessen ein Download (attachment) ausgelöst.
import { getViewer, canView, canViewDraft } from "@/lib/visibility";
import {
  getCharacterSheetAccess,
  getCharacterSheetBytes,
} from "@/lib/characterSheets";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return new Response("Ungültiger Bogen.", { status: 400 });
  }

  const access = await getCharacterSheetAccess(id);
  // is_active (nicht soft-deleted) + Sichtbarkeit + Entwurf-Gate des
  // Charakters. 404 statt 403, damit die Existenz nicht durchsickert.
  if (!access || !access.isActive) {
    return new Response("Bogen nicht gefunden.", { status: 404 });
  }

  const viewer = await getViewer();
  if (
    !canView(access.visibility, access.ownerId, viewer) ||
    !canViewDraft(access.isDraft, access.ownerId, viewer)
  ) {
    return new Response("Bogen nicht gefunden.", { status: 404 });
  }

  // Bytes zu einer Bogen-ID sind unveränderlich (ein neuer Upload bekommt eine
  // neue Zeile/ID) — ID als starker ETag, 304 spart den R2-Fetch.
  const etag = `"character-sheet-${id}"`;
  const cacheControl = "private, max-age=3600";
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cacheControl },
    });
  }

  const object = await getCharacterSheetBytes(access.r2Key);
  if (!object) {
    return new Response("Bogen nicht gefunden.", { status: 404 });
  }

  const download =
    new URL(request.url).searchParams.get("download") === "1";
  const asciiName = access.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const disposition = `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(access.fileName)}`;

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": cacheControl,
      ETag: etag,
    },
  });
}

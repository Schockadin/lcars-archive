import sql from "@/lib/db";
import { getViewer, canView } from "@/lib/visibility";
import { ownPortraitAssetKey } from "@/lib/imageThumbnails";
import { getCharacterPortraitThumbnailBytes } from "@/lib/characterPortraitThumbnails";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [row] = await sql<
    {
      portrait: string | null;
      portrait_source: string | null;
      is_draft: boolean;
      player_id: number | null;
    }[]
  >`
    SELECT portrait, metadata->>'portraitSource' AS portrait_source,
           is_draft, player_id FROM characters
    WHERE slug = ${slug} AND deleted_at IS NULL
  `;
  if (!row || !canView(row.is_draft, row.player_id, await getViewer())) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }
  const portrait = row.portrait_source || row.portrait;
  const key =
    portrait &&
    ownPortraitAssetKey(portrait, process.env.R2_ASSET_PUBLIC_BASE_URL);
  // Die Query ist nur ein Cache-Buster. Sie kann keinen anderen Objekt-Key
  // auswählen: gelesen wird ausschließlich das aktuelle DB-Portrait.
  if (
    !key ||
    new URL(request.url).searchParams.get("image") !== key.split("/")[1]
  ) {
    return new Response("Bild nicht gefunden.", { status: 404 });
  }
  const etag = `"portrait-thumb-${key.split("/")[1]}-webp-v1"`;
  const headers = {
    "Content-Type": "image/webp",
    "Cache-Control": row.is_draft
      ? "private, no-store"
      : "private, max-age=3600, immutable",
    ETag: etag,
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  try {
    const body = await getCharacterPortraitThumbnailBytes(key);
    return body
      ? new Response(new Uint8Array(body), { headers })
      : new Response("Bild nicht gefunden.", { status: 404 });
  } catch {
    return new Response(
      "Das Bild kann nicht als Vorschau verarbeitet werden.",
      { status: 422 },
    );
  }
}

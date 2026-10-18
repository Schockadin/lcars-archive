import sql from "@/lib/db";
import { renderContentHtml } from "@/lib/autolink";
import { markdownToSafeHtml } from "@/lib/markdown";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "Ungültige Ereignis-ID." }, { status: 400 });
  }

  if (kind === "session") {
    const rows = await sql<{ body_md: string | null }[]>`
      SELECT b.body_md
      FROM mission_synopsis_blocks b
      JOIN missions m ON m.id = b.mission_id
      WHERE b.id = ${id}
        AND m.deleted_at IS NULL
        AND m.is_draft = false
      LIMIT 1
    `;
    if (!rows[0]) {
      return Response.json({ error: "Zusammenfassung nicht gefunden." }, { status: 404 });
    }
    return Response.json(
      { html: await renderContentHtml(rows[0].body_md ?? "") },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (kind === "manual") {
    const rows = await sql<{ detail: string | null }[]>`
      SELECT detail
      FROM timeline_events
      WHERE id = ${id} AND origin = 'manual'
      LIMIT 1
    `;
    if (!rows[0]) {
      return Response.json({ error: "Ereignis nicht gefunden." }, { status: 404 });
    }
    return Response.json(
      {
        html: rows[0].detail
          ? await markdownToSafeHtml(rows[0].detail)
          : null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return Response.json({ error: "Unbekannter Detailtyp." }, { status: 400 });
}

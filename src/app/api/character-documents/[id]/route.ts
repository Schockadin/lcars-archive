import { verifySession } from "@/lib/dal";
import {
  getCharacterDocumentAccess,
  getCharacterDocumentBytes,
} from "@/lib/characterDocuments";
import { markdownToSafeHtml } from "@/lib/markdown";

function disposition(fileName: string, download: boolean): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  return `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlDocument(title: string, body: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{max-width:900px;margin:0 auto;padding:32px;background:#111827;color:#e5e7eb;font:16px/1.6 system-ui,sans-serif}a{color:#7dd3fc}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}table{border-collapse:collapse}th,td{border:1px solid #64748b;padding:6px 10px}img{max-width:100%}</style></head><body>${body}</body></html>`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return new Response("Ungültiges Dokument.", { status: 400 });
  }

  const access = await getCharacterDocumentAccess(id);
  if (!access || !access.isActive || access.ownerId !== session.userId) {
    return new Response("Dokument nicht gefunden.", { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": disposition(access.fileName, download),
    "X-Content-Type-Options": "nosniff",
  };

  if (!download && access.kind !== "pdf") {
    const source = access.extractedText ?? "";
    const body =
      access.kind === "md"
        ? await markdownToSafeHtml(source)
        : `<pre>${escapeHtml(source)}</pre>`;
    return new Response(htmlDocument(access.fileName, body), {
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const object = await getCharacterDocumentBytes(access.r2Key);
  if (!object) return new Response("Dokument nicht gefunden.", { status: 404 });
  return new Response(new Uint8Array(object.body), {
    headers: { ...headers, "Content-Type": access.contentMime },
  });
}

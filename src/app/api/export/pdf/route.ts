// Lädt einen Inhalt als PDF-Datei herunter (neuer "Als PDF exportieren"-
// Eintrag im Share-Menü, siehe ShareMenu.tsx) — gleiches Muster wie
// route.ts im markdown-Geschwisterordner (Link statt Server Action, damit
// der Browser den Download direkt über Content-Disposition anstößt).
// renderContentPdf (src/lib/pdf/ContentPdfDocument.tsx) nutzt
// @react-pdf/renderer — eine reine Node-Bibliothek ohne Chromium, läuft
// dadurch auf Netlify Functions.
import {
  loadExportableContent,
  isExportContentType,
} from "@/lib/contentExport";
import { renderContentPdf } from "@/lib/pdf/ContentPdfDocument";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "";
  const slug = url.searchParams.get("slug") ?? "";

  if (!isExportContentType(type) || !slug) {
    return new Response("Ungültige Export-Anfrage.", { status: 400 });
  }

  const content = await loadExportableContent(type, slug);
  if (!content) {
    return new Response("Inhalt nicht gefunden oder kein Zugriff.", {
      status: 404,
    });
  }

  const pdfBuffer = await renderContentPdf(content);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${content.filenameBase}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

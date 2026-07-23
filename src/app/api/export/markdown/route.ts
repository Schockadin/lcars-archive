// Lädt einen Inhalt als Markdown-Datei mit YAML-Frontmatter herunter (neuer
// "Als Markdown exportieren"-Eintrag im Share-Menü, siehe ShareMenu.tsx) —
// als normaler Link statt einer Server Action, damit der Browser den
// Content-Disposition-Header selbst als Download behandelt, ohne
// Blob/base64-Umweg über den Client. Sichtbarkeits-/Teilnehmer-Prüfung
// passiert vollständig in loadExportableContent (src/lib/contentExport.ts).
import matter from "gray-matter";
import {
  loadExportableContent,
  isExportContentType,
} from "@/lib/contentExport";

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

  const markdown = matter.stringify(content.bodyMarkdown, content.frontmatter);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${content.filenameBase}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}

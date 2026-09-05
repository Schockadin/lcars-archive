// Lädt den Kampagnenband als PDF herunter (Knopf auf der Missions-Übersicht).
// Gleiches Muster wie die Nachbar-Routen: eine Route statt einer Server
// Action, damit der Browser den Download über Content-Disposition direkt
// anstößt.
//
// Nur für Angemeldete: der Band bündelt den gesamten Kampagnenverlauf in einer
// Datei. Was darin steht, richtet sich nach der Sichtbarkeit der
// anfordernden Person — die Filterung passiert in getCampaignBook über
// dasselbe canView wie auf den Inhaltsseiten, nicht erst in der Anzeige.
import { verifySession } from "@/lib/dal";
import { getViewer } from "@/lib/visibility";
import { getUserById } from "@/lib/users";
import { getCampaignBook } from "@/lib/campaignBook";
import { renderCampaignBookPdf } from "@/lib/pdf/CampaignBookPdfDocument";
import { getBaseUrl } from "@/lib/http";

export async function GET() {
  const session = await verifySession();
  const viewer = await getViewer();
  // verifySession leitet Nicht-Angemeldete bereits um; getViewer kann trotzdem
  // null liefern (deaktiviertes Konto, veraltete session_version) — dann gilt
  // der sichere Fallback: nur Öffentliches.
  const user = await getUserById(session.userId);

  const [book, baseUrl] = await Promise.all([
    getCampaignBook(viewer),
    getBaseUrl(),
  ]);

  const pdfBuffer = await renderCampaignBookPdf({
    book,
    campaignTitle: "Neo Archive",
    requestedBy: user?.name ?? null,
    baseUrl,
  });

  const stamp = book.generatedAt.toISOString().slice(0, 10);
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kampagnenband-${stamp}.pdf"`,
      // Der Band hängt am Betrachter — er darf nirgends zwischengelagert
      // werden.
      "Cache-Control": "private, no-store",
    },
  });
}

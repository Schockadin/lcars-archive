// Lädt die Akte EINER Mission als PDF herunter (Knopf auf der
// Mission-Detailseite). Gleiches Muster wie die Nachbar-Routen: eine Route
// statt einer Server Action, damit der Browser den Download über
// Content-Disposition direkt anstößt.
//
// Was in der Akte steht, richtet sich nach der Sichtbarkeit der anfordernden
// Person — die Filterung passiert in getMissionBook über dasselbe canView wie
// auf den Inhaltsseiten, nicht erst in der Anzeige.
//
// Nur für Angemeldete, wie schon beim Vorgänger (dem Kampagnenband): eine
// Akte bündelt einen ganzen Missionsverlauf in einer weiterreichbaren Datei,
// und wer nicht angemeldet ist, hat dafür keinen Bedarf, den die Seite selbst
// nicht deckt.
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getViewer, canViewMissionDraft } from "@/lib/visibility";
import { getUserById } from "@/lib/users";
import { getMissionBook } from "@/lib/missionBook";
import { renderMissionBookPdf } from "@/lib/pdf/MissionBookPdfDocument";
import { getBaseUrl } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ missionSlug: string }> },
) {
  const session = await verifySession();
  const viewer = await getViewer();
  // verifySession leitet Nicht-Angemeldete bereits um; getViewer kann trotzdem
  // null liefern (deaktiviertes Konto, veraltete session_version) — dann gilt
  // der sichere Fallback: nur Öffentliches.
  const { missionSlug } = await params;

  const [book, user, baseUrl] = await Promise.all([
    getMissionBook(missionSlug, viewer),
    getUserById(session.userId),
    getBaseUrl(),
  ]);
  // Unbekannter Slug oder eine Entwurfs-Mission, die diese Person nicht sehen
  // darf: dieselbe Antwort wie die Detailseite, damit die Akte nicht verrät,
  // was die Seite verschweigt.
  if (!book || !canViewMissionDraft(book.isDraft, viewer)) notFound();

  const pdfBuffer = await renderMissionBookPdf({
    book,
    campaignTitle: "Neo Archive",
    requestedBy: user?.name ?? null,
    baseUrl,
  });

  const stamp = book.generatedAt.toISOString().slice(0, 10);
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mission-${book.slug}-${stamp}.pdf"`,
      // Die Akte hängt am Betrachter — sie darf nirgends zwischengelagert
      // werden.
      "Cache-Control": "private, no-store",
    },
  });
}

import { getViewer } from "@/lib/visibility";

// Der Knopf „Kampagnenband (PDF)" über der Missionsliste.
//
// Eigene async-Komponente, damit die Missions-Übersicht prerenderbar bleibt:
// getViewer() liest Cookies und macht alles dynamisch, was es umgibt. Deshalb
// steht nur dieser Knopf in einer Suspense-Grenze (siehe page.tsx) — dasselbe
// Muster wie im Mission-Detail-Layout.
//
// Für Gäste gibt es den Knopf nicht: der Band bündelt den gesamten
// Kampagnenverlauf und setzt ein Konto voraus (die Route weist Gäste ohnehin
// ab, aber ein Link, der zur Anmeldung führt, wäre eine Sackgasse).
export default async function CampaignBookLink() {
  const viewer = await getViewer();
  if (!viewer) return null;

  return (
    // Download über einen Link statt einer Action: der Browser lädt die Datei
    // dann direkt über Content-Disposition herunter.
    <a
      href="/api/export/campaign-book"
      download
      className="lcars-pill-btn--outline"
      title="Alle Missionen und Logbücher als ein PDF"
    >
      Kampagnenband (PDF)
    </a>
  );
}

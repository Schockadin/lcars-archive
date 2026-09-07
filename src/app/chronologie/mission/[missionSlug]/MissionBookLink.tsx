// Der Knopf „Missionsakte (PDF)" auf der Mission-Detailseite.
//
// Reines Markup: ob er erscheint, entscheidet die Seite (sie kennt den
// Betrachter ohnehin). Der Vorgänger — der Knopf für den Kampagnenband auf
// der Missions-Übersicht — musste den Betrachter selbst holen, weil die
// Übersicht sonst nicht mehr prerenderbar gewesen wäre; die Detailseite ist
// ohnehin betrachterabhängig.
export default function MissionBookLink({
  missionSlug,
}: {
  missionSlug: string;
}) {
  return (
    // Download über einen Link statt einer Action: der Browser lädt die Datei
    // dann direkt über Content-Disposition herunter.
    <a
      href={`/api/export/mission-book/${missionSlug}`}
      download
      className="lcars-pill-btn--outline"
      title="Diese Mission mit allen Logbüchern als PDF"
    >
      Missionsakte (PDF)
    </a>
  );
}

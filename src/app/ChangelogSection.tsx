import { LcarsDataRow } from "@/components/lcars";
import {
  featuredChangelogEntries,
  hideChangelogCategories,
} from "@/lib/changelog";
import { hiddenCategoriesForRoles } from "@/lib/changelogCategories";
import {
  getFeaturedChangelogVersions,
  getHiddenChangelogCategories,
} from "@/lib/changelogSettings";
import ChangelogFeatureList from "./ChangelogFeatureList";

// „Neue Funktionen" auf dem Dashboard, direkt über den Neuigkeiten: die vom
// Admin unter /admin/changelog ausgewählten Changelog-Versionen, gesammelt in
// einem Akkordeon (siehe /changelog für die vollständige Liste). Ohne Auswahl
// gilt der Default (nur die jüngste Version, siehe featuredChangelogEntries);
// wählt der Admin bewusst nichts aus, verschwindet die Box.
//
// Zusätzlich bestimmt die Administration je ROLLE, welche Kategorien hier
// nicht erscheinen. Das passiert auf dem Server: was für diese Person nicht
// gedacht ist, wird gar nicht erst ausgeliefert — ein Filter im Browser wäre
// nur eine Anzeige-Entscheidung. Die vollständige Liste unter /changelog
// bleibt davon unberührt, sie ist öffentlich.
//
// Bewusst eingeklappt — die Neuigkeiten darunter sind das, was sich täglich
// ändert; die Funktionsliste liest man einmal je Release.
export default async function ChangelogSection({
  roles,
}: {
  // Alle Rollen der Person (Primär- + Zusatzrollen), nicht nur die erste.
  roles: string[];
}) {
  const [selected, hiddenByRole] = await Promise.all([
    getFeaturedChangelogVersions(),
    getHiddenChangelogCategories(),
  ]);

  const entries = hideChangelogCategories(
    featuredChangelogEntries(selected),
    hiddenCategoriesForRoles(hiddenByRole, roles),
  );
  if (entries.length === 0) return null;

  // Gesamtzahl der Stichpunkte über alle gewählten Versionen — steht als Wert
  // links in der DataRow.
  const totalItems = entries.reduce((sum, entry) => sum + entry.items.length, 0);

  return (
    <LcarsDataRow value={totalItems} label="Neue Funktionen">
      <ChangelogFeatureList entries={entries} />
    </LcarsDataRow>
  );
}

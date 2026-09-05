import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import {
  featuredChangelogEntries,
  changelogItemText,
  changelogItemTutorial,
  type ChangelogEntry,
} from "@/lib/changelog";
import { getFeaturedChangelogVersions } from "@/lib/changelogSettings";
import { tutorialSectionHref, tutorialSectionLabel } from "@/lib/tutorialSections";

// „Neue Funktionen" auf dem Dashboard, direkt über den Neuigkeiten: die vom
// Admin unter /admin/changelog ausgewählten Changelog-Versionen, gesammelt in
// einem Akkordeon (siehe /changelog für die vollständige Liste). Ohne Auswahl
// gilt der Default (nur die jüngste Version, siehe featuredChangelogEntries);
// wählt der Admin bewusst nichts aus, verschwindet die Box.
//
// Bewusst eingeklappt — die Neuigkeiten darunter sind das, was sich täglich
// ändert; die Funktionsliste liest man einmal je Release.
export default async function ChangelogSection() {
  const selected = await getFeaturedChangelogVersions();
  const entries = featuredChangelogEntries(selected);
  if (entries.length === 0) return null;

  // Gesamtzahl der Stichpunkte über alle gewählten Versionen — steht als Wert
  // links in der DataRow.
  const totalItems = entries.reduce((sum, entry) => sum + entry.items.length, 0);

  return (
    <LcarsDataRow value={totalItems} label="Neue Funktionen">
      <div id="changelog" className="lcars-text flex flex-col gap-[16px]">
        {entries.map((entry) => (
          <ChangelogEntryBlock key={entry.version} entry={entry} />
        ))}
        <p>
          <Link href="/changelog" className="underline">
            Alle Änderungen ansehen
          </Link>
        </p>
      </div>
    </LcarsDataRow>
  );
}

// Ein einzelner Versions-Abschnitt (Überschrift + Stichpunkte) innerhalb der
// gesammelten Box. Mehrere Versionen stehen so klar getrennt untereinander.
function ChangelogEntryBlock({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <h2>
        {entry.title}{" "}
        <span className="text-lcars-ink-dim font-lcars-mono text-[14px]">
          · Version {entry.version}
        </span>
      </h2>
      <ul className="flex list-disc flex-col gap-[4px] pl-[20px]">
        {entry.items.map((item, i) => {
          const tutorial = changelogItemTutorial(item);
          return (
            <li key={i}>
              {changelogItemText(item)}
              {tutorial && (
                <>
                  {" "}
                  <Link
                    href={tutorialSectionHref(tutorial)}
                    className="lcars-changelog-tutorial-link"
                  >
                    Im Tutorial: {tutorialSectionLabel(tutorial)}
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

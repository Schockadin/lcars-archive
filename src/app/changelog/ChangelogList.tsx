"use client";
import { LcarsDataRow } from "@/components/lcars";
import ChangelogControls from "@/components/changelog/ChangelogControls";
import ChangelogItems from "@/components/changelog/ChangelogItems";
import { useChangelogView } from "@/components/changelog/useChangelogView";
import type { ChangelogEntry } from "@/lib/changelog";

// Vergleicht zwei "Major.Minor"-Versionsstrings numerisch statt
// lexikografisch — ein reiner String-Vergleich würde "1.10" fälschlich vor
// "1.9" einsortieren.
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Die vollständige Änderungsliste: ein Akkordeon je Version, darüber die
// gemeinsame Leiste aus Sortierung und Kategorie-Filter (siehe
// ChangelogControls — dieselbe Bedienung wie in der Dashboard-Box).
//
// Sortiert wird nach Version (die Reihenfolge der Akkordeons) oder nach
// Kategorie (die Reihenfolge der Stichpunkte INNERHALB jeder Version) — eine
// Version enthält fast immer Verschiedenes, „nach Kategorie" kann die
// Versionen also nicht ordnen.
//
// defaultOpen (nur das aktuellste Akkordeon offen) wird pro Versions-Key
// einmalig beim Mount gesetzt (siehe DataRow.tsx) — Sortieren und Filtern
// ordnen die Zeilen nur um, ohne die Auf-/Zugeklappt-Zustände
// zurückzusetzen, da React sie per key erhält.
export default function ChangelogList({
  entries,
}: {
  entries: ChangelogEntry[];
}) {
  const view = useChangelogView(entries);

  const newestVersion = entries.reduce(
    (newest, entry) =>
      compareVersions(entry.version, newest) > 0 ? entry.version : newest,
    entries[0]?.version ?? "",
  );

  const sorted =
    view.sortKey === "version"
      ? [...view.visible].sort((a, b) =>
          view.sortDir === "desc"
            ? compareVersions(b.version, a.version)
            : compareVersions(a.version, b.version),
        )
      : // Beim Sortieren nach Kategorie bleibt die Versionsfolge, wie sie ist
        // (neueste zuerst) — sonst änderten sich zwei Dinge auf einmal.
        [...view.visible].sort((a, b) =>
          compareVersions(b.version, a.version),
        );

  return (
    <div className="flex flex-col gap-[16px]">
      <ChangelogControls
        categories={view.categories}
        selected={view.selected}
        onToggleCategory={view.toggleCategory}
        onClearCategories={view.clearCategories}
        sortKey={view.sortKey}
        sortDir={view.sortDir}
        onSortChange={view.setSort}
      />

      {sorted.length === 0 ? (
        <p className="lcars-empty-state">Keine Einträge für diese Auswahl.</p>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {sorted.map((entry, index) => (
            <LcarsDataRow
              key={entry.version}
              // Wert links = laufende Zeilennummer (1-basiert in der aktuellen
              // Sortierrichtung), Pille = „Version <Major.Minor>".
              value={index + 1}
              label={`Version ${entry.version}`}
              defaultOpen={entry.version === newestVersion}
              className="lcars-data-row--full"
            >
              <div className="lcars-text flex flex-col gap-[8px]">
                <h3>{entry.title}</h3>
                <ChangelogItems items={entry.items} />
              </div>
            </LcarsDataRow>
          ))}
        </div>
      )}
    </div>
  );
}

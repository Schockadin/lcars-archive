"use client";
import { LcarsSortSwitch, type SortDir } from "@/components/lcars";
import {
  changelogCategoryColor,
  changelogCategoryLabel,
  type ChangelogCategoryId,
} from "@/lib/changelogCategories";

// Die Leiste über einer Changelog-Liste: Sortierung (Version oder Kategorie)
// und Kategorie-Filter.
//
// Bewusst EINE Komponente für beide Anzeigestellen — die öffentliche Liste
// unter /changelog und die Box „Neue Funktionen" auf dem Dashboard zeigen
// denselben Inhalt; zwei Fassungen der Bedienung würden sich unweigerlich
// auseinanderentwickeln.
//
// Die Filter sind Knöpfe mit aria-pressed statt Checkboxen: sie schalten eine
// Ansicht um, sie sind kein Formular (dieselbe Bauart wie die Jahresleiste der
// Chronologie).

export type ChangelogSortKey = "version" | "category";

export default function ChangelogControls({
  categories,
  selected,
  onToggleCategory,
  onClearCategories,
  sortKey,
  sortDir,
  onSortChange,
  className = "",
}: {
  // Nur die Kategorien, die in den Einträgen wirklich vorkommen.
  categories: ChangelogCategoryId[];
  selected: readonly string[];
  onToggleCategory: (id: ChangelogCategoryId) => void;
  onClearCategories: () => void;
  sortKey: ChangelogSortKey;
  sortDir: SortDir;
  onSortChange: (key: ChangelogSortKey, dir: SortDir) => void;
  className?: string;
}) {
  const active = new Set(selected);

  return (
    <div className={`changelog-controls ${className}`}>
      <LcarsSortSwitch
        className="changelog-sort"
        options={[
          { key: "version", label: "Version" },
          { key: "category", label: "Kategorie" },
        ]}
        sortKey={sortKey}
        sortDir={sortDir}
        onChange={(key, dir) => onSortChange(key as ChangelogSortKey, dir)}
      />

      {/* Bei nur einer vorkommenden Kategorie wäre der Filter eine Reihe mit
          genau einem Knopf, der nichts einschränkt. */}
      {categories.length > 1 && (
        <div
          className="changelog-filterbar"
          role="group"
          aria-label="Nach Kategorie filtern"
        >
          <button
            type="button"
            className="changelog-chip"
            aria-pressed={active.size === 0}
            onClick={onClearCategories}
          >
            Alle
          </button>
          {categories.map((id) => (
            <button
              key={id}
              type="button"
              className="changelog-chip"
              style={
                { "--changelog-color": changelogCategoryColor(id) } as React.CSSProperties
              }
              aria-pressed={active.has(id)}
              onClick={() => onToggleCategory(id)}
            >
              {changelogCategoryLabel(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

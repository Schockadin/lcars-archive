"use client";
import { LcarsSortSwitch, type SortDir } from "@/components/lcars";
import {
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
// Der Filter ist ein Auswahlfeld, kein Knopf je Kategorie: acht Chips brauchen
// eine Zeile, die auf schmalen Schirmen waagerecht scrollt und dann rechts
// abgeschnitten aussieht. Dasselbe Muster wie der Autor-Filter der
// Missions-Übersicht (.mission-author-filter) — eine Auswahl auf einmal, und
// „Alle Kategorien" führt zurück.

export type ChangelogSortKey = "version" | "category";

export default function ChangelogControls({
  categories,
  selected,
  onSelectCategory,
  sortKey,
  sortDir,
  onSortChange,
  idPrefix,
}: {
  // Nur die Kategorien, die in den Einträgen wirklich vorkommen.
  categories: ChangelogCategoryId[];
  // null = keine Einschränkung.
  selected: ChangelogCategoryId | null;
  onSelectCategory: (id: ChangelogCategoryId | null) => void;
  sortKey: ChangelogSortKey;
  sortDir: SortDir;
  onSortChange: (key: ChangelogSortKey, dir: SortDir) => void;
  // Die Leiste steht zweimal in der App (Dashboard und /changelog) — ohne
  // eigenen Präfix trügen beide Auswahlfelder dieselbe id.
  idPrefix: string;
}) {
  return (
    <div className="changelog-controls">
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

      {/* Bei nur einer vorkommenden Kategorie wäre das Feld eine Auswahl mit
          genau einem Eintrag, der nichts einschränkt. */}
      {categories.length > 1 && (
        <select
          id={`${idPrefix}-category`}
          className="changelog-filter rounded-full"
          value={selected ?? ""}
          onChange={(e) =>
            onSelectCategory((e.target.value || null) as ChangelogCategoryId | null)
          }
          aria-label="Nach Kategorie filtern"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((id) => (
            <option key={id} value={id}>
              {changelogCategoryLabel(id)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

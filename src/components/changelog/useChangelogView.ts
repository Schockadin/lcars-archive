"use client";
import { useMemo, useState } from "react";
import type { SortDir } from "@/components/lcars";
import {
  changelogCategoriesPresent,
  filterChangelogEntries,
  sortChangelogItemsByCategory,
  type ChangelogEntry,
} from "@/lib/changelog";
import type { ChangelogCategoryId } from "@/lib/changelogCategories";
import type { ChangelogSortKey } from "./ChangelogControls";

// Der gemeinsame Zustand beider Changelog-Ansichten: gewählte Kategorie,
// Sortierschlüssel und -richtung — plus die daraus abgeleitete Liste.
//
// Als Hook statt als Komponente, weil die beiden Stellen ihr Ergebnis sehr
// unterschiedlich rahmen (ein Akkordeon je Version unter /changelog, ein
// gemeinsames Akkordeon auf dem Dashboard) — geteilt gehört die Rechnung,
// nicht das Gerüst.
export function useChangelogView(entries: ChangelogEntry[]) {
  // Eine Kategorie auf einmal (das Auswahlfeld gibt genau eine her); null =
  // keine Einschränkung.
  const [selected, setSelected] = useState<ChangelogCategoryId | null>(null);
  const [sortKey, setSortKey] = useState<ChangelogSortKey>("version");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Das Auswahlfeld führt die Kategorien des GESAMTEN Bestands, nicht die der
  // gefilterten Auswahl — sonst stünde nach dem ersten Filtern nur noch die
  // gewählte Kategorie darin und man käme nicht mehr zu einer anderen.
  const categories = useMemo(
    () => changelogCategoriesPresent(entries),
    [entries],
  );

  const visible = useMemo(() => {
    const filtered = filterChangelogEntries(entries, selected ? [selected] : []);
    return sortKey === "category"
      ? sortChangelogItemsByCategory(filtered, sortDir === "asc" ? "asc" : "desc")
      : filtered;
  }, [entries, selected, sortKey, sortDir]);

  return {
    categories,
    selected,
    selectCategory: setSelected,
    sortKey,
    sortDir,
    setSort: (key: ChangelogSortKey, dir: SortDir) => {
      setSortKey(key);
      setSortDir(dir);
    },
    visible,
  };
}

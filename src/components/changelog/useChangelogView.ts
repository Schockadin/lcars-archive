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

// Der gemeinsame Zustand beider Changelog-Ansichten: gewählte Kategorien,
// Sortierschlüssel und -richtung — plus die daraus abgeleitete Liste.
//
// Als Hook statt als Komponente, weil die beiden Stellen ihr Ergebnis sehr
// unterschiedlich rahmen (ein Akkordeon je Version unter /changelog, ein
// gemeinsames Akkordeon auf dem Dashboard) — geteilt gehört die Rechnung,
// nicht das Gerüst.
export function useChangelogView(entries: ChangelogEntry[]) {
  const [selected, setSelected] = useState<ChangelogCategoryId[]>([]);
  const [sortKey, setSortKey] = useState<ChangelogSortKey>("version");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Die Filterleiste zeigt die Kategorien des GESAMTEN Bestands, nicht die der
  // gefilterten Auswahl — sonst verschwänden die übrigen Knöpfe nach dem
  // ersten Klick und man käme nicht mehr zurück.
  const categories = useMemo(
    () => changelogCategoriesPresent(entries),
    [entries],
  );

  const visible = useMemo(() => {
    const filtered = filterChangelogEntries(entries, selected);
    return sortKey === "category"
      ? sortChangelogItemsByCategory(filtered, sortDir === "asc" ? "asc" : "desc")
      : filtered;
  }, [entries, selected, sortKey, sortDir]);

  function toggleCategory(id: ChangelogCategoryId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  return {
    categories,
    selected,
    toggleCategory,
    clearCategories: () => setSelected([]),
    sortKey,
    sortDir,
    setSort: (key: ChangelogSortKey, dir: SortDir) => {
      setSortKey(key);
      setSortDir(dir);
    },
    visible,
  };
}

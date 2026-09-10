"use client";
import { Fragment, useMemo, useState } from "react";
import { ArchiveEntryPreview } from "@/types/archive";
import {
  LcarsListFilterInput,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";
import ArchiveEntryRow from "./ArchiveEntryRow";
import ArchiveEntryCreateOverlay from "./ArchiveEntryCreateOverlay";

// Die vollständige Datenbank bleibt nach dem Laden im Browser: Suche,
// Kategorie und alphabetische Richtung reagieren damit sofort, wie die
// Filter der Chronologie. ?cat= aus der Kategorienleiste ist nur die
// vorgewählte, weiterhin teilbare Ansicht.
export default function ArchiveEntryList({
  entries,
  initialCategory = null,
  canCreate = false,
  userId,
  canAutoLink = false,
}: {
  entries: ArchiveEntryPreview[];
  initialCategory?: ArchiveEntryPreview["category"] | null;
  canCreate?: boolean;
  userId?: number;
  canAutoLink?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ArchiveEntryPreview["category"] | null>(
    initialCategory,
  );
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const categories = useMemo(() => {
    const present = new Set(entries.map((entry) => entry.category));
    if (category) present.add(category);
    return CATEGORY_ORDER.filter((key) => present.has(key));
  }, [entries, category]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((entry) => !category || entry.category === category)
      .filter((entry) => !q || entry.title.toLowerCase().includes(q))
      .sort((a, b) => {
        const comparison = a.title.localeCompare(b.title, "de");
        return sortDir === "asc" ? comparison : -comparison;
      });
  }, [entries, query, category, sortDir]);

  function letterOf(entry: ArchiveEntryPreview) {
    return entry.title.trim().charAt(0).toLocaleUpperCase("de-DE") || "#";
  }

  return (
    <div>
      <div className="lcars-toolbar">
        {canCreate && userId && (
          <ArchiveEntryCreateOverlay
            userId={userId}
            canAutoLink={canAutoLink}
            initialCategory={category === "dialogue" ? "other" : category ?? "other"}
          />
        )}
        <LcarsSortSwitch
          className="mission-sort"
          options={[{ key: "title", label: "Alphabetisch" }]}
          sortKey="title"
          sortDir={sortDir}
          onChange={(_key, direction) => setSortDir(direction)}
        />
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Einträge filtern"
        />
        {categories.length > 1 && (
          <select
            className="mission-author-filter rounded-full"
            value={category ?? ""}
            onChange={(event) =>
              setCategory(
                (event.target.value || null) as ArchiveEntryPreview["category"] | null,
              )
            }
            aria-label="Nach Kategorie filtern"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_CONFIG[key].plural}
              </option>
            ))}
          </select>
        )}
      </div>

      {list.length === 0 ? (
        <p className="lcars-empty-state">Keine Einträge für diesen Filter.</p>
      ) : (
        <>
          <div className="archive-entry-list">
            {list.map((entry, index) => {
              const letter = letterOf(entry);
              const previous = index > 0 ? list[index - 1] : null;
              const startsPeriod = !previous || letterOf(previous) !== letter;

              return (
                <Fragment key={entry.id}>
                  {startsPeriod && (
                    <h2 className="timeline-period archive-letter-period">
                      {letter}
                    </h2>
                  )}
                  <ArchiveEntryRow entry={entry} />
                </Fragment>
              );
            })}
          </div>
          <p className="lcars-eyebrow mt-[12px]">
            {list.length === entries.length
              ? `${entries.length} Einträge`
              : `${list.length} von ${entries.length} Einträgen`}
          </p>
        </>
      )}
    </div>
  );
}

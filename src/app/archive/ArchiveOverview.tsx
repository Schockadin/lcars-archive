"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import { ArchiveCategory, ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";

// Archiv-Übersicht: enzyklopädische Einträge, gruppiert nach Kategorie
// (stabile Reihenfolge aus CATEGORY_ORDER) und optional darauf gefiltert.
export default function ArchiveOverview({
  entries,
}: {
  entries: ArchiveEntryPreview[];
}) {
  const [filter, setFilter] = useState<ArchiveCategory | null>(null);

  // Nur Kategorien anbieten, die tatsächlich Einträge haben.
  const available = useMemo(
    () =>
      CATEGORY_ORDER.filter((cat) => entries.some((e) => e.category === cat)),
    [entries],
  );

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.filter((cat) => filter === null || cat === filter)
        .map((cat) => ({
          cat,
          ...CATEGORY_CONFIG[cat],
          items: entries.filter((e) => e.category === cat),
        }))
        .filter((g) => g.items.length > 0),
    [entries, filter],
  );

  return (
    <div className="flex flex-col items-start w-[var(--lcars-charpage-w)]">
      <div className="mb-[16px] w-full">
        <h1 className="lcars-data-row-heading">Archiv</h1>
        <p className="lcars-eyebrow">Enzyklopädie der bekannten Welt</p>
      </div>
      {entries.length === 0 ? (
        <p className="char-file-bio-empty">Keine Archiv-Einträge hinterlegt.</p>
      ) : (
        <>
          {available.length > 1 && (
            <select
              className="mission-author-filter mb-[16px]"
              value={filter ?? ""}
              onChange={(e) =>
                setFilter((e.target.value as ArchiveCategory) || null)
              }
              aria-label="Nach Kategorie filtern"
            >
              <option value="">Alle Kategorien</option>
              {available.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].plural}
                </option>
              ))}
            </select>
          )}

          {groups.map((group) => (
            <section key={group.cat} className="mb-[20px] w-full">
              <LcarsDataRow
                value={group.items.length}
                label={group.plural}
                accentColor={group.color}
                color={group.color}
                className="ml-[12px]"
              />
              <ArchiveRows entries={group.items} color={group.color} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function ArchiveRows({
  entries,
  color,
}: {
  entries: ArchiveEntryPreview[];
  color: string;
}) {
  return (
    <div className="mt-[8px] flex flex-col gap-[3px]">
      {entries.map((e) => (
        <Link
          key={e.id}
          href={`/archive/${e.slug}`}
          className="character-entry"
          style={{ "--entry-color": color } as React.CSSProperties}
        >
          <span className="character-entry-stub">
            {CATEGORY_CONFIG[e.category].label.slice(0, 3).toUpperCase()}
          </span>
          <span className="character-entry-bar">
            <span className="character-entry-name">{e.title}</span>
            {e.tags[0] && (
              <span className="character-entry-rank">{e.tags[0]}</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";

export interface CatalogEntry {
  id: number;
  name: string;
  group: string;
  detail?: string | null;
  html?: string | null;
}

export default function RulesCatalog({
  entries,
  groupLabel,
}: {
  entries: CatalogEntry[];
  groupLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [grouping, setGrouping] = useState<"group" | "none">("group");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const sortFactor = sortDirection === "asc" ? 1 : -1;
  const groups = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.group))].sort(
        (a, b) => a.localeCompare(b, "de") * sortFactor,
      ),
    [entries, sortFactor],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("de");
    return entries
      .filter((entry) => !groupFilter || entry.group === groupFilter)
      .filter(
        (entry) =>
          !search ||
          [entry.name, entry.group, entry.detail, entry.html].some((value) =>
            value?.toLocaleLowerCase("de").includes(search),
          ),
      )
      .sort(
        (a, b) => a.name.localeCompare(b.name, "de") * sortFactor,
      );
  }, [entries, groupFilter, query, sortFactor]);
  const sections =
    grouping === "none"
      ? [{ label: "", entries: filtered }]
      : [...new Set(filtered.map((entry) => entry.group))]
          .sort((a, b) => a.localeCompare(b, "de") * sortFactor)
          .map((label) => ({
            label,
            entries: filtered.filter((entry) => entry.group === label),
          }));

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap gap-[8px]">
        <label className="flex min-w-[220px] flex-1 flex-col gap-[4px]">
          <span className="lcars-eyebrow">Suchen</span>
          <input
            className="lcars-input rounded-full"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name oder Beschreibung"
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-[4px]">
          <span className="lcars-eyebrow">{groupLabel} filtern</span>
          <select
            className="lcars-input rounded-full"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
          >
            <option value="">Alle</option>
            {groups.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-[4px]">
          <span className="lcars-eyebrow">Gruppierung</span>
          <select
            className="lcars-input rounded-full"
            value={grouping}
            onChange={(event) =>
              setGrouping(event.target.value as "group" | "none")
            }
          >
            <option value="group">Nach {groupLabel.toLocaleLowerCase("de")}</option>
            <option value="none">Ohne Gruppen</option>
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-[4px]">
          <span className="lcars-eyebrow">Alphabetische Sortierung</span>
          <select
            className="lcars-input rounded-full"
            value={sortDirection}
            onChange={(event) =>
              setSortDirection(event.target.value as "asc" | "desc")
            }
          >
            <option value="asc">A bis Z</option>
            <option value="desc">Z bis A</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="lcars-empty-state">Keine passenden Einträge.</p>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {sections.map((section) => (
            <section
              key={section.label || "all"}
              className="flex flex-col gap-[8px]"
            >
              {section.label && (
                <h2 className="text-lcars-primary-ink">{section.label}</h2>
              )}
              <ul className="flex flex-col gap-[8px]">
                {section.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-[var(--lcars-ink-dim)]/25 p-[12px]"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                      <h3 className="font-semibold">{entry.name}</h3>
                      {grouping === "none" && (
                        <span className="lcars-eyebrow">{entry.group}</span>
                      )}
                    </div>
                    {entry.detail && (
                      <p className="mt-[4px] text-lcars-ink-dim text-[13px]">
                        {entry.detail}
                      </p>
                    )}
                    {entry.html && (
                      <div
                        className="mission-body mt-[6px]"
                        dangerouslySetInnerHTML={{ __html: entry.html }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

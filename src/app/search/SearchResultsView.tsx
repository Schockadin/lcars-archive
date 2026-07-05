"use client";
import { useMemo, useState } from "react";
import type { SearchResult, SearchResultType } from "@/types/search";
import { TYPE_COLOR, TYPE_FILTER_LABEL } from "@/lib/searchFormat";
import { LcarsAkteCard, LcarsSwitch } from "@/components/lcars";

type TypeFilter = "all" | SearchResultType;

const TYPE_ORDER: SearchResultType[] = [
  "character",
  "mission",
  "log",
  "archive",
];

// Ergebnisliste der /search-Seite: Filter nach Treffertyp. Reihenfolge
// immer Relevanz (aus der DB-Query, bereits typgruppiert und je Gruppe
// Präfix-Treffer zuerst). Lokaler useState statt URL-Params, analog zu
// MissionsOverview.tsx/DialogueList.tsx.
export default function SearchResultsView({
  query,
  results,
}: {
  query: string;
  results: SearchResult[];
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const counts = useMemo(() => {
    const c: Record<SearchResultType, number> = {
      character: 0,
      mission: 0,
      log: 0,
      archive: 0,
    };
    for (const r of results) c[r.type]++;
    return c;
  }, [results]);

  const filtered = useMemo(
    () =>
      typeFilter === "all"
        ? results
        : results.filter((r) => r.type === typeFilter),
    [results, typeFilter],
  );

  if (results.length === 0) {
    return <p className="lcars-empty-state">Keine Treffer für „{query}“.</p>;
  }

  return (
    <div>
      <LcarsSwitch
        className="search-type-filter"
        itemClassName="lcars-switch"
        options={[
          { key: "all" as TypeFilter, label: `Alle (${results.length})` },
          ...TYPE_ORDER.map((t) => ({
            key: t as TypeFilter,
            label: `${TYPE_FILTER_LABEL[t]} (${counts[t]})`,
          })),
        ]}
        active={typeFilter}
        onChange={setTypeFilter}
      />

      {filtered.length === 0 ? (
        <p className="lcars-empty-state">Keine Treffer in dieser Kategorie.</p>
      ) : (
        <div className="archive-entry-list">
          {filtered.map((r, i) => (
            <SearchResultCard key={`${r.href}-${i}`} result={r} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Hebt alle Vorkommen von query im Snippet hervor (case-insensitive).
function highlightSnippet(snippet: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return snippet;
  const parts = snippet.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  // Ungerade Indizes sind die eingefangene Gruppe, also die Treffer selbst.
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="search-snippet-mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function SearchResultCard({
  result,
  query,
}: {
  result: SearchResult;
  query: string;
}) {
  return (
    <LcarsAkteCard
      href={result.href}
      color={TYPE_COLOR[result.type]}
      title={result.label}
      summary={
        result.snippet ? highlightSnippet(result.snippet, query) : undefined
      }
      meta={<span>{result.sublabel}</span>}
    />
  );
}

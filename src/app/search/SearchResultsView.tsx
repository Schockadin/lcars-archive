"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { SearchResult, SearchResultType } from "@/types/search";
import { TYPE_COLOR, TYPE_FILTER_LABEL } from "@/lib/searchFormat";

type TypeFilter = "all" | SearchResultType;
type SortMode = "relevance" | "alpha";

const TYPE_ORDER: SearchResultType[] = ["character", "mission", "log", "archive"];

// Ergebnisliste der /search-Seite: Filter nach Treffertyp + Sortierung
// (Relevanz = Reihenfolge aus der DB-Query, bereits typgruppiert und je
// Gruppe Präfix-Treffer zuerst; Titel A–Z = flach, typübergreifend
// alphabetisch). Lokaler useState statt URL-Params, analog zu
// MissionsOverview.tsx/DialogueList.tsx.
export default function SearchResultsView({
  query,
  results,
}: {
  query: string;
  results: SearchResult[];
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortMode>("relevance");

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

  const sorted = useMemo(() => {
    if (sort === "relevance") return filtered;
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label, "de"));
  }, [filtered, sort]);

  if (results.length === 0) {
    return <p className="lcars-empty-state">Keine Treffer für „{query}“.</p>;
  }

  return (
    <div>
      <div className="mission-toolbar">
        <div className="search-type-filter">
          <TypeFilterButton
            active={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          >
            Alle ({results.length})
          </TypeFilterButton>
          {TYPE_ORDER.map((t) => (
            <TypeFilterButton
              key={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_FILTER_LABEL[t]} ({counts[t]})
            </TypeFilterButton>
          ))}
        </div>

        <div className="mission-sort">
          <SortButton
            active={sort === "relevance"}
            onClick={() => setSort("relevance")}
          >
            Relevanz
          </SortButton>
          <SortButton
            active={sort === "alpha"}
            onClick={() => setSort("alpha")}
          >
            Titel (A–Z)
          </SortButton>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="lcars-empty-state">
          Keine Treffer in dieser Kategorie.
        </p>
      ) : (
        <div className="archive-entry-list">
          {sorted.map((r, i) => (
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

function TypeFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="lcars-switch"
      style={{
        backgroundColor: active ? "var(--lcars-amber)" : "var(--lcars-surface)",
        color: active ? "var(--lcars-bg)" : "var(--lcars-text-data)",
        borderColor: active ? "var(--lcars-amber)" : "var(--lcars-text-data)",
        padding: "0 14px",
      }}
    >
      {children}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="lcars-switch flex-1"
      style={{
        backgroundColor: active ? "var(--lcars-amber)" : "var(--lcars-surface)",
        color: active ? "var(--lcars-bg)" : "var(--lcars-text-data)",
        borderColor: active ? "var(--lcars-amber)" : "var(--lcars-text-data)",
      }}
    >
      {children}
    </div>
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
    <Link
      href={result.href}
      className="mission-akte"
      style={
        { "--mission-color": TYPE_COLOR[result.type] } as React.CSSProperties
      }
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{result.label}</span>
        {result.snippet && (
          <span className="mission-akte-summary block">
            {highlightSnippet(result.snippet, query)}
          </span>
        )}
        <span className="mission-akte-meta">
          <span>{result.sublabel}</span>
        </span>
      </span>
    </Link>
  );
}

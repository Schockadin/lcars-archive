"use client";
import { useMemo, useState } from "react";
import { ArchiveEntryPreview } from "@/types/archive";
import { LcarsListFilterInput } from "@/components/lcars";
import ArchiveEntryCard from "./ArchiveEntryCard";

// Nicht-Gespräch-Archivkategorien (Orte, Fraktionen, Technik, NPCs …) als
// Akten-Karten mit Freitext-Filter über den Titel. Bewusst als kleine
// Client-Komponente (die Kategorie-Seite selbst bleibt eine Server-Komponente),
// damit die Filterung ohne Server-Roundtrip läuft — analog zu DialogueList für
// die Gespräche.
export default function ArchiveEntryList({
  entries,
}: {
  entries: ArchiveEntryPreview[];
}) {
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? entries.filter((e) => e.title.toLowerCase().includes(q))
      : entries;
  }, [entries, query]);

  return (
    <div>
      <div className="flex lcars-filters">
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Einträge filtern"
          className="mb-[16px]"
        />
      </div>

      {list.length === 0 ? (
        <p className="lcars-empty-state">Keine Einträge für diesen Filter.</p>
      ) : (
        <div className="archive-entry-list">
          {list.map((entry) => (
            <ArchiveEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

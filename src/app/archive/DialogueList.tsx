"use client";
import { useMemo, useState } from "react";
import { ArchiveEntryPreview } from "@/types/archive";
import { LcarsSortSwitch, type SortDir } from "@/components/lcars";
import ArchiveEntryCard from "./ArchiveEntryCard";

// Gesprächs-Liste mit Teilnehmer-Filter. Sortierung nach id, Richtung per
// Switch umschaltbar. initialParticipant (z.B. aus ?participant=<slug>) belegt
// den Filter vor.
export default function DialogueList({
  entries,
  initialParticipant = null,
}: {
  entries: ArchiveEntryPreview[];
  initialParticipant?: string | null;
}) {
  const [participant, setParticipant] = useState<string | null>(
    initialParticipant,
  );
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Distinkte Teilnehmer über alle Gespräche (für die Auswahl).
  const participants = useMemo(() => {
    const map = new Map<string, string>(); // slug → name
    for (const e of entries) {
      for (const p of e.metadata.participants) {
        if (!map.has(p.slug)) map.set(p.slug, p.name);
      }
    }
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const list = useMemo(() => {
    const filtered = participant
      ? entries.filter((e) =>
          e.metadata.participants.some((p) => p.slug === participant),
        )
      : entries;
    return [...filtered].sort((a, b) =>
      sortDir === "asc" ? a.id - b.id : b.id - a.id,
    );
  }, [entries, participant, sortDir]);

  return (
    <div>
      <div className="flex lcars-filters">
        {participants.length > 0 && (
          <select
            className="mission-author-filter mb-[16px] mr-[5px]"
            value={participant ?? ""}
            onChange={(e) => setParticipant(e.target.value || null)}
            aria-label="Nach Teilnehmer filtern"
          >
            <option value="">Alle Teilnehmer</option>
            {participants.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <LcarsSortSwitch
          className="flex gap-[5px] w-full sm:w-[50%] mb-[16px]"
          options={[{ key: "date", label: "Datum" }]}
          sortKey="date"
          sortDir={sortDir}
          onChange={(_key, dir) => setSortDir(dir)}
        />
      </div>

      {list.length === 0 ? (
        <p className="lcars-empty-state">
          Keine Gespräche mit diesem Teilnehmer.
        </p>
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

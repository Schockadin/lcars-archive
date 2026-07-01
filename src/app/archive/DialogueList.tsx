"use client";
import { useMemo, useState } from "react";
import { ArchiveEntryPreview } from "@/types/archive";
import ArchiveEntryCard from "./ArchiveEntryCard";

type SortDir = "asc" | "desc";

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
      <div className="flex lcars-filters max-w-[500px]">
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

        <SortDirSwitch dir={sortDir} onChange={setSortDir} />
      </div>

      {list.length === 0 ? (
        <p className="char-file-bio-empty">
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

// Umschalter für die Sortierrichtung (nach id auf-/absteigend).
function SortDirSwitch({
  dir,
  onChange,
}: {
  dir: SortDir;
  onChange: (d: SortDir) => void;
}) {
  const options: { key: SortDir; label: string }[] = [
    { key: "asc", label: "Älteste zuerst" },
    { key: "desc", label: "Neueste zuerst" },
  ];

  return (
    <div className="flex gap-[5px] w-full mb-[16px]">
      {options.map((opt) => {
        const isActive = dir === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="lcars-switch flex-1"
            style={{
              backgroundColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-surface)",
              color: isActive ? "var(--lcars-bg)" : "var(--lcars-text-data)",
              borderColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-text-data)",
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}

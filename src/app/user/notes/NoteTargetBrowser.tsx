"use client";

import { useState } from "react";
import { LcarsListFilterInput } from "@/components/lcars";
import ChronoCard from "@/components/timeline/ChronoCard";
import ChronoRow from "@/components/timeline/ChronoRow";
import type { NoteTarget } from "@/lib/contentNotes";
import { CONTENT_TYPES } from "@/lib/contentTypeFormat";

const kinds = ["character", "mission_log", "archive", "mission"] as const;
const visuals = {
  character: CONTENT_TYPES.character,
  mission_log: CONTENT_TYPES.mission_log,
  archive: CONTENT_TYPES.archive_entry,
  mission: CONTENT_TYPES.mission,
};

export default function NoteTargetBrowser({
  targets,
  loading,
  error,
  onSelect,
  onClear,
}: {
  targets: NoteTarget[];
  loading: boolean;
  error: string;
  onSelect: (target: NoteTarget) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<NoteTarget["type"] | "all">("all");
  const matching = targets.filter(
    (target) =>
      (kind === "all" || target.type === kind) &&
      target.label
        .toLocaleLowerCase("de")
        .includes(query.trim().toLocaleLowerCase("de")),
  );

  return (
    <div className="lcars-text flex flex-col gap-[14px]">
      <p>
        Wähle einen sichtbaren Eintrag für die Notiz oder lege sie ohne
        Zuordnung an.
      </p>
      <div className="lcars-toolbar !mb-0">
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Einträge für die Notiz suchen"
          placeholder="Einträge suchen…"
        />
      </div>
      <div className="flex flex-wrap gap-[6px]" aria-label="Inhaltsart filtern">
        <button
          type="button"
          className="lcars-pill-btn--outline !min-w-0 !w-auto !px-[12px] aria-pressed:!bg-lcars-primary aria-pressed:!text-lcars-bg"
          aria-pressed={kind === "all"}
          onClick={() => setKind("all")}
        >
          Alle
        </button>
        {kinds.map((type) => (
          <button
            key={type}
            type="button"
            className="lcars-pill-btn--outline !min-w-0 !w-auto !px-[12px] aria-pressed:!bg-lcars-primary aria-pressed:!text-lcars-bg"
            aria-pressed={kind === type}
            onClick={() => setKind(type)}
          >
            {visuals[type].pluralLabel}
          </button>
        ))}
      </div>
      {loading ? (
        <p role="status">Einträge werden geladen…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : matching.length === 0 ? (
        <p className="lcars-empty-state">Keine passenden Einträge.</p>
      ) : (
        <div className="archive-entry-list">
          {kinds.map((type) => {
            const rows = matching.filter((target) => target.type === type);
            if (rows.length === 0) return null;
            const visual = visuals[type];
            return (
              <section key={type} aria-label={visual.pluralLabel}>
                <h3 className="timeline-period archive-letter-period">
                  {visual.pluralLabel}
                </h3>
                {rows.map((target) => (
                  <ChronoRow
                    key={`${target.type}:${target.slug}`}
                    color={visual.color}
                  >
                    <ChronoCard
                      color={visual.color}
                      tag={visual.label}
                      title={target.label}
                      ariaLabel={`${target.label} — ${visual.label} auswählen`}
                      onActivate={() => onSelect(target)}
                    />
                  </ChronoRow>
                ))}
              </section>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="lcars-pill-btn--outline self-start"
        onClick={onClear}
      >
        Ohne Eintrag fortfahren
      </button>
    </div>
  );
}

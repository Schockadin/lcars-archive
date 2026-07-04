"use client";
import { useMemo, useOptimistic, useState } from "react";
import Link from "next/link";
import { LcarsAccordion } from "@/components/lcars";
import type { UserContentLog } from "@/lib/characters";
import type { DialogueSummary } from "@/lib/dialoguesCore";
import type { UserContentArchiveEntry } from "@/lib/archive";
import { fmtDate, sessionLabel, periodLabel } from "@/lib/missionFormat";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import type { Character } from "@/types/character";
import type { MissionPreview } from "@/types/missions";
import VisibilitySelect from "./VisibilitySelect";
import DeleteMissionLogButton from "./DeleteMissionLogButton";

type CategoryFilter =
  | "all"
  | "characters"
  | "logs"
  | "dialogues"
  | "archive"
  | "missions";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "Alle Kategorien",
  characters: "Charaktere",
  logs: "Einsatzberichte",
  dialogues: "Gespräche",
  archive: "Archiv-Einträge",
  missions: "Missionen",
};

// "Meine Inhalte": genau vier feste Kategorien (Charaktere, Einsatzberichte,
// Gespräche, Archiv-Einträge), jede ein Akkordeon mit Visibility-Switch pro
// Eintrag. Darüber zwei Filter (Charakter, Kategorie) in einem responsiven
// Grid — Charakter-Filter wirkt auf Charaktere/Einsatzberichte/Gespräche
// (Archiv-Einträge sind Owner-, nicht Charakter-gebunden), Kategorie-Filter
// blendet einzelne Akkordeons komplett aus.
export default function UserContentBrowser({
  characters,
  logs,
  dialogues,
  archiveEntries,
  missions,
  canManageMissions,
  ownUserId,
}: {
  characters: Character[];
  logs: UserContentLog[];
  dialogues: DialogueSummary[];
  archiveEntries: UserContentArchiveEntry[];
  missions: MissionPreview[];
  canManageMissions: boolean;
  ownUserId: number;
}) {
  const [characterFilter, setCharacterFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Missionen sind eine eigene Kategorie, aber nur für Admin/GM sichtbar
  // (siehe canManageMissions) — kein Owner-/Charakter-Konzept wie bei den
  // anderen vier Kategorien, deshalb auch vom Charakter-Filter unberührt.
  const visibleCategoryKeys = (
    Object.keys(CATEGORY_LABELS) as CategoryFilter[]
  ).filter((key) => key !== "missions" || canManageMissions);

  // Für die optimistische Löschung (DeleteMissionLogButton): entfernt den
  // Log sofort aus der Liste, fällt aber automatisch auf `logs` (den echten
  // Server-Stand) zurück, sobald die Transition abgeschlossen ist — bei
  // Erfolg über revalidatePath eine kürzere Liste, bei Fehlschlag dieselbe
  // wie vorher (der gelöschte Log erscheint dann wieder).
  const [optimisticLogs, removeOptimisticLog] = useOptimistic(
    logs,
    (state, deletedId: number) => state.filter((l) => l.id !== deletedId),
  );

  const filteredCharacters = useMemo(
    () =>
      characters.filter((c) => !characterFilter || c.slug === characterFilter),
    [characters, characterFilter],
  );
  const filteredLogs = useMemo(
    () =>
      optimisticLogs.filter(
        (l) => !characterFilter || l.character_slug === characterFilter,
      ),
    [optimisticLogs, characterFilter],
  );
  const filteredDialogues = useMemo(
    () =>
      dialogues.filter(
        (d) => !characterFilter || d.characterSlug === characterFilter,
      ),
    [dialogues, characterFilter],
  );

  const total =
    characters.length +
    logs.length +
    dialogues.length +
    archiveEntries.length +
    (canManageMissions ? missions.length : 0);

  if (total === 0) {
    return <p className="lcars-empty-state">Noch keine Inhalte vorhanden.</p>;
  }

  const showCharacters =
    categoryFilter === "all" || categoryFilter === "characters";
  const showLogs = categoryFilter === "all" || categoryFilter === "logs";
  const showDialogues =
    categoryFilter === "all" || categoryFilter === "dialogues";
  const showArchive = categoryFilter === "all" || categoryFilter === "archive";
  const showMissions =
    canManageMissions &&
    (categoryFilter === "all" || categoryFilter === "missions");

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
        <select
          className="mission-author-filter"
          value={characterFilter ?? ""}
          onChange={(e) => setCharacterFilter(e.target.value || null)}
          aria-label="Nach Charakter filtern"
        >
          <option value="">Alle Charaktere</option>
          {characters.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="mission-author-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          aria-label="Nach Kategorie filtern"
        >
          {visibleCategoryKeys.map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {showCharacters && (
        <LcarsAccordion
          value={filteredCharacters.length}
          label="Charaktere"
          color="var(--lcars-amber)"
        >
          {filteredCharacters.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Charaktere für diese Auswahl.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {filteredCharacters.map((c) => (
                <div key={c.id} className="flex items-center gap-[8px]">
                  <Link
                    href={`/characters/${c.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-amber)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">{c.name}</span>
                    </span>
                  </Link>
                  <VisibilitySelect
                    contentType="character"
                    id={c.id}
                    initialValue={c.visibility}
                  />
                </div>
              ))}
            </div>
          )}
        </LcarsAccordion>
      )}

      {showLogs && (
        <LcarsAccordion
          value={filteredLogs.length}
          label="Einsatzberichte"
          color="var(--lcars-blue)"
        >
          {filteredLogs.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Einsatzberichte für diese Auswahl.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-[8px]">
                  <Link
                    href={`/missions/${log.mission_slug}/${log.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-blue)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">
                        {log.title}
                      </span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Session</b> {sessionLabel(log.session_nr)}
                        </span>
                        <span>
                          <b>Datum</b> {fmtDate(log.log_date)}
                        </span>
                        <span>
                          <b>Mission</b> {log.mission_title}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <div className="flex flex-col items-end gap-[4px]">
                    <VisibilitySelect
                      contentType="mission_log"
                      id={log.id}
                      initialValue={log.visibility}
                    />
                    <div className="flex gap-[8px] items-center justify-between">
                      <Link
                        href={`/users/${ownUserId}/mission-logs/${log.id}/edit`}
                        className="lcars-link-text text-[14px]"
                      >
                        Bearbeiten
                      </Link>
                      <DeleteMissionLogButton
                        logId={log.id}
                        onOptimisticDelete={() => removeOptimisticLog(log.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LcarsAccordion>
      )}

      {showDialogues && (
        <LcarsAccordion
          value={filteredDialogues.length}
          label="Gespräche"
          color="var(--lcars-text-data)"
        >
          {filteredDialogues.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Gespräche für diese Auswahl.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {filteredDialogues.map((d) => (
                <div key={d.slug} className="flex items-center gap-[8px]">
                  <Link
                    href={
                      d.open ? `/dialogues/${d.slug}` : `/archive/${d.slug}`
                    }
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": d.open
                          ? "var(--lcars-green)"
                          : "var(--lcars-red)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">
                        {d.title}
                      </span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Gesprächspartner</b> {d.partnerName}
                        </span>
                        <span>
                          <b>Status</b> {d.open ? "Offen" : "Abgeschlossen"}
                        </span>
                      </span>
                    </span>
                  </Link>
                  {/* Sichtbarkeit ist nur vom Ersteller (owner_user_id)
                      änderbar — der Gesprächspartner sieht nur den Status. */}
                  {d.ownerUserId === ownUserId ? (
                    <VisibilitySelect
                      contentType="dialogue"
                      id={d.id}
                      initialValue={d.visibility}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </LcarsAccordion>
      )}

      {showArchive && (
        <LcarsAccordion
          value={archiveEntries.length}
          label="Archiv-Einträge"
          color="var(--lcars-purple)"
        >
          {archiveEntries.length === 0 ? (
            <p className="lcars-empty-state">
              Noch keine eigenen Archiv-Einträge vorhanden.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {archiveEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-[8px]">
                  <Link
                    href={`/archive/${entry.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-purple)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">
                        {entry.title}
                      </span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Kategorie</b>{" "}
                          {CATEGORY_CONFIG[entry.category].label}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <VisibilitySelect
                    contentType="archive_entry"
                    id={entry.id}
                    initialValue={entry.visibility}
                  />
                </div>
              ))}
            </div>
          )}
        </LcarsAccordion>
      )}

      {showMissions && (
        <LcarsAccordion
          value={missions.length}
          label="Missionen"
          color="var(--lcars-green)"
        >
          {missions.length === 0 ? (
            <p className="lcars-empty-state">Noch keine Missionen vorhanden.</p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {missions.map((m) => (
                <div key={m.id} className="flex items-center gap-[8px]">
                  <Link
                    href={`/missions/${m.slug}`}
                    className="mission-akte flex-1"
                    style={
                      { "--mission-color": "var(--lcars-green)" } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">{m.title}</span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Zeitraum</b> {periodLabel(m.started_at, m.ended_at)}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <Link
                    href={`/users/${ownUserId}/missions/${m.id}/edit`}
                    className="lcars-link-text text-[14px]"
                  >
                    Bearbeiten
                  </Link>
                </div>
              ))}
            </div>
          )}
        </LcarsAccordion>
      )}
    </div>
  );
}

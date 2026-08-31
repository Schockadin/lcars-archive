"use client";
import { useMemo, useOptimistic, useState } from "react";
import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { UserContentLog } from "@/lib/characters";
import type { DialogueSummary } from "@/lib/dialoguesCore";
import type { UserContentArchiveEntry } from "@/lib/archive";
import { fmtDate, sessionLabel, periodLabel } from "@/lib/missionFormat";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import { PencilIcon } from "@/lib/icons";
import type { Character } from "@/types/character";
import type { MissionPreview } from "@/types/missions";
import VisibilitySelect from "./VisibilitySelect";
import DeleteOwnContentButton from "./DeleteOwnContentButton";
import { LcarsListFilterInput } from "@/components/lcars";

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

// Eine Zeile mit allen drei möglichen Aktionen (Sichtbarkeit/Bearbeiten/
// Löschen) statt gestapelter Einzelelemente — jede Aktion ist optional, da
// nicht jeder Inhaltstyp alle drei kennt (Missionen z.B. keine Sichtbarkeit,
// Gespräche kein Bearbeiten-Formular).
function ContentActionRow({
  visibility,
  editHref,
  deleteButton,
}: {
  visibility?: React.ReactNode;
  editHref?: string;
  deleteButton?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[8px]">
      {visibility}
      {editHref && (
        <Link
          href={editHref}
          className="lcars-icon-btn"
          aria-label="Bearbeiten"
          title="Bearbeiten"
        >
          <PencilIcon />
        </Link>
      )}
      {deleteButton}
    </div>
  );
}

// "Meine Inhalte": fünf feste Kategorien (Charaktere, Einsatzberichte,
// Gespräche, Archiv-Einträge, Missionen), jede ein Akkordeon mit
// Sichtbarkeit/Bearbeiten/Löschen pro Eintrag in einer Zeile. Eigene
// Charaktere/Missionen/Einsatzberichte/Archiv-Einträge, die noch als Entwurf
// gespeichert sind (siehe is_draft, scripts/schema.sql), werden aus ihren
// jeweiligen Akkordeons herausgenommen und stattdessen gemeinsam in einer
// eigenen "Entwürfe"-DataRow oben angezeigt — unabhängig vom Kategorie-Filter,
// da sie den schnellen Überblick über die eigene unfertige Arbeit bieten
// soll. Darüber zwei Filter (Charakter, Kategorie) in einem responsiven
// Grid — Charakter-Filter wirkt auf Charaktere/Einsatzberichte/Gespräche
// (Archiv-Einträge/Missionen sind Owner-, nicht Charakter-gebunden),
// Kategorie-Filter blendet einzelne Akkordeons (außer Entwürfe) komplett aus.
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

  // Für die optimistische Löschung (DeleteOwnContentButton): entfernt den
  // Eintrag sofort aus der jeweiligen Liste, fällt aber automatisch auf die
  // echten Props zurück, sobald die Transition abgeschlossen ist — bei
  // Erfolg über revalidatePath eine kürzere Liste, bei Fehlschlag dieselbe
  // wie vorher (der Eintrag erscheint dann wieder).
  const [optimisticCharacters, removeOptimisticCharacter] = useOptimistic(
    characters,
    (state, id: number) => state.filter((c) => c.id !== id),
  );
  const [optimisticLogs, removeOptimisticLog] = useOptimistic(
    logs,
    (state, id: number) => state.filter((l) => l.id !== id),
  );
  const [optimisticDialogues, removeOptimisticDialogue] = useOptimistic(
    dialogues,
    (state, id: number) => state.filter((d) => d.id !== id),
  );
  const [optimisticArchiveEntries, removeOptimisticArchiveEntry] =
    useOptimistic(archiveEntries, (state, id: number) =>
      state.filter((e) => e.id !== id),
    );
  const [optimisticMissions, removeOptimisticMission] = useOptimistic(
    missions,
    (state, id: number) => state.filter((m) => m.id !== id),
  );

  const filteredCharacters = useMemo(
    () =>
      optimisticCharacters.filter(
        (c) => !characterFilter || c.slug === characterFilter,
      ),
    [optimisticCharacters, characterFilter],
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
      optimisticDialogues.filter(
        (d) => !characterFilter || d.characterSlug === characterFilter,
      ),
    [optimisticDialogues, characterFilter],
  );

  // Entwürfe aus den jeweiligen Listen herausgetrennt — publishedX rendert
  // im normalen Akkordeon, draftX in der gemeinsamen Entwürfe-DataRow unten.
  const publishedCharacters = useMemo(
    () => filteredCharacters.filter((c) => !c.is_draft),
    [filteredCharacters],
  );
  const draftCharacters = useMemo(
    () => filteredCharacters.filter((c) => c.is_draft),
    [filteredCharacters],
  );
  const publishedLogs = useMemo(
    () => filteredLogs.filter((l) => !l.is_draft),
    [filteredLogs],
  );
  const draftLogs = useMemo(
    () => filteredLogs.filter((l) => l.is_draft),
    [filteredLogs],
  );
  const publishedArchiveEntries = useMemo(
    () => optimisticArchiveEntries.filter((e) => !e.isDraft),
    [optimisticArchiveEntries],
  );
  const draftArchiveEntries = useMemo(
    () => optimisticArchiveEntries.filter((e) => e.isDraft),
    [optimisticArchiveEntries],
  );
  const publishedMissions = useMemo(
    () => optimisticMissions.filter((m) => !m.isDraft),
    [optimisticMissions],
  );
  const draftMissions = useMemo(
    () => optimisticMissions.filter((m) => m.isDraft),
    [optimisticMissions],
  );

  const totalDrafts =
    draftCharacters.length +
    draftLogs.length +
    draftArchiveEntries.length +
    (canManageMissions ? draftMissions.length : 0);

  const total =
    characters.length +
    logs.length +
    dialogues.length +
    archiveEntries.length +
    (canManageMissions ? missions.length : 0);

  const [query, setQuery] = useState("");
  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return {
      publishedCharacters: publishedCharacters.filter((e) =>
        e.name.toLowerCase().includes(q),
      ),
      draftCharacters: draftCharacters.filter((e) =>
        e.name.toLowerCase().includes(q),
      ),
      dialogues: filteredDialogues.filter((e) =>
        e.title.toLowerCase().includes(q),
      ),
      publishedArchiveEntries: publishedArchiveEntries.filter((e) =>
        e.title.toLowerCase().includes(q),
      ),
      draftArchiveEntries: draftArchiveEntries.filter((e) =>
        e.title.toLowerCase().includes(q),
      ),
      publishedLogs: publishedLogs.filter((e) =>
        e.title.toLowerCase().includes(q),
      ),
      draftLogs: draftLogs.filter((e) => e.title.toLowerCase().includes(q)),
      publishedMissions: publishedMissions.filter((e) =>
        e.title.toLowerCase().includes(q),
      ),
      draftMissions: draftMissions.filter((e) =>
        e.title.toLowerCase().includes(q),
      ),
    };
  }, [
    publishedCharacters,
    draftCharacters,
    filteredDialogues,
    publishedArchiveEntries,
    draftArchiveEntries,
    publishedLogs,
    draftLogs,
    publishedMissions,
    draftMissions,
    query,
  ]);

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
          className="lcars-input rounded-full text-right"
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
          className="lcars-input rounded-full text-right"
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
      <div className="flex lcars-filters">
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Einträge filtern"
          className="mb-[16px]"
        />
      </div>

      <LcarsDataRow
        value={totalDrafts}
        label="Entwürfe"
        color="var(--lcars-quinary)"
      >
        {totalDrafts === 0 ? (
          <p className="lcars-empty-state">Keine Entwürfe vorhanden.</p>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {entries.draftCharacters.map((c) => (
              <div
                key={`character-${c.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
              >
                <Link
                  href={`/characters/${c.slug}`}
                  className="mission-akte flex-1"
                  style={
                    {
                      "--mission-color": "var(--lcars-quinary)",
                    } as React.CSSProperties
                  }
                >
                  <span className="mission-akte-rail" />
                  <span className="mission-akte-body text-left">
                    <span className="mission-akte-title block">{c.name}</span>
                    <span className="mission-akte-meta">
                      <span>
                        <b>Typ</b> Charakter
                      </span>
                    </span>
                  </span>
                </Link>
                <ContentActionRow
                  visibility={
                    <VisibilitySelect
                      contentType="character"
                      id={c.id}
                      initialValue={c.visibility}
                    />
                  }
                  editHref={`/user/characters/${c.id}/edit`}
                  deleteButton={
                    <DeleteOwnContentButton
                      contentType="character"
                      id={c.id}
                      onOptimisticDelete={() => removeOptimisticCharacter(c.id)}
                    />
                  }
                />
              </div>
            ))}
            {canManageMissions &&
              entries.draftMissions.map((m) => (
                <div
                  key={`mission-${m.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <Link
                    href={`/missions/${m.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-quinary)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">
                        {m.title}
                      </span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Typ</b> Mission
                        </span>
                      </span>
                    </span>
                  </Link>
                  <ContentActionRow
                    editHref={`/user/missions/${m.id}/edit`}
                    deleteButton={
                      <DeleteOwnContentButton
                        contentType="mission"
                        id={m.id}
                        onOptimisticDelete={() => removeOptimisticMission(m.id)}
                      />
                    }
                  />
                </div>
              ))}
            {entries.draftLogs.map((log) => (
              <div
                key={`log-${log.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
              >
                <Link
                  href={`/missions/${log.mission_slug}/${log.slug}`}
                  className="mission-akte flex-1"
                  style={
                    {
                      "--mission-color": "var(--lcars-quinary)",
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
                        <b>Typ</b> Einsatzbericht
                      </span>
                      <span>
                        <b>Mission</b> {log.mission_title}
                      </span>
                    </span>
                  </span>
                </Link>
                <ContentActionRow
                  visibility={
                    <VisibilitySelect
                      contentType="mission_log"
                      id={log.id}
                      initialValue={log.visibility}
                    />
                  }
                  editHref={`/user/mission-logs/${log.id}/edit`}
                  deleteButton={
                    <DeleteOwnContentButton
                      contentType="mission_log"
                      id={log.id}
                      onOptimisticDelete={() => removeOptimisticLog(log.id)}
                    />
                  }
                />
              </div>
            ))}
            {entries.draftArchiveEntries.map((entry) => (
              <div
                key={`archive-${entry.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
              >
                <Link
                  href={`/archive/${entry.slug}`}
                  className="mission-akte flex-1"
                  style={
                    {
                      "--mission-color": "var(--lcars-quinary)",
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
                        <b>Typ</b> Archiv-Eintrag
                      </span>
                      <span>
                        <b>Kategorie</b> {CATEGORY_CONFIG[entry.category].label}
                      </span>
                    </span>
                  </span>
                </Link>
                <ContentActionRow
                  visibility={
                    <VisibilitySelect
                      contentType="archive_entry"
                      id={entry.id}
                      initialValue={entry.visibility}
                    />
                  }
                  editHref={`/user/archive/${entry.id}/edit`}
                  deleteButton={
                    <DeleteOwnContentButton
                      contentType="archive_entry"
                      id={entry.id}
                      onOptimisticDelete={() =>
                        removeOptimisticArchiveEntry(entry.id)
                      }
                    />
                  }
                />
              </div>
            ))}
          </div>
        )}
      </LcarsDataRow>

      {showCharacters && (
        <LcarsDataRow
          value={entries.publishedCharacters.length}
          label="Charaktere"
          color="var(--lcars-primary)"
        >
          {entries.publishedCharacters.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Charaktere für diese Auswahl.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.publishedCharacters.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <Link
                    href={`/characters/${c.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-primary)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">{c.name}</span>
                    </span>
                  </Link>
                  <ContentActionRow
                    visibility={
                      <VisibilitySelect
                        contentType="character"
                        id={c.id}
                        initialValue={c.visibility}
                      />
                    }
                    editHref={`/user/characters/${c.id}/edit`}
                    deleteButton={
                      <DeleteOwnContentButton
                        contentType="character"
                        id={c.id}
                        onOptimisticDelete={() =>
                          removeOptimisticCharacter(c.id)
                        }
                      />
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </LcarsDataRow>
      )}

      {showLogs && (
        <LcarsDataRow
          value={entries.publishedLogs.length}
          label="Einsatzberichte"
          color="var(--lcars-tertiary)"
        >
          {entries.publishedLogs.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Einsatzberichte für diese Auswahl.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.publishedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <Link
                    href={`/missions/${log.mission_slug}/${log.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-tertiary)",
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
                  <ContentActionRow
                    visibility={
                      <VisibilitySelect
                        contentType="mission_log"
                        id={log.id}
                        initialValue={log.visibility}
                      />
                    }
                    editHref={`/user/mission-logs/${log.id}/edit`}
                    deleteButton={
                      <DeleteOwnContentButton
                        contentType="mission_log"
                        id={log.id}
                        onOptimisticDelete={() => removeOptimisticLog(log.id)}
                      />
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </LcarsDataRow>
      )}

      {showDialogues && (
        <LcarsDataRow
          value={entries.dialogues.length}
          label="Gespräche"
          color="var(--lcars-ink-data)"
        >
          {entries.dialogues.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Gespräche für diese Auswahl.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.dialogues.map((d) => (
                <div
                  key={d.slug}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <Link
                    href={
                      d.open ? `/dialogues/${d.slug}` : `/archive/${d.slug}`
                    }
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": d.open
                          ? "var(--lcars-senary)"
                          : "var(--lcars-quinary)",
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
                  {/* Sichtbarkeit/Löschen sind nur vom Ersteller (owner_user_id)
                      nutzbar — der Gesprächspartner sieht nur den Status. */}
                  {d.ownerUserId === ownUserId ? (
                    <ContentActionRow
                      visibility={
                        <VisibilitySelect
                          contentType="dialogue"
                          id={d.id}
                          initialValue={d.visibility}
                        />
                      }
                      deleteButton={
                        <DeleteOwnContentButton
                          contentType="dialogue"
                          id={d.id}
                          onOptimisticDelete={() =>
                            removeOptimisticDialogue(d.id)
                          }
                        />
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </LcarsDataRow>
      )}

      {showArchive && (
        <LcarsDataRow
          value={entries.publishedArchiveEntries.length}
          label="Archiv-Einträge"
          color="var(--lcars-secondary)"
        >
          {entries.publishedArchiveEntries.length === 0 ? (
            <p className="lcars-empty-state">
              Noch keine eigenen Archiv-Einträge vorhanden.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.publishedArchiveEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <Link
                    href={`/archive/${entry.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-secondary)",
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
                  <ContentActionRow
                    visibility={
                      <VisibilitySelect
                        contentType="archive_entry"
                        id={entry.id}
                        initialValue={entry.visibility}
                      />
                    }
                    editHref={`/user/archive/${entry.id}/edit`}
                    deleteButton={
                      <DeleteOwnContentButton
                        contentType="archive_entry"
                        id={entry.id}
                        onOptimisticDelete={() =>
                          removeOptimisticArchiveEntry(entry.id)
                        }
                      />
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </LcarsDataRow>
      )}

      {showMissions && (
        <LcarsDataRow
          value={entries.publishedMissions.length}
          label="Missionen"
          color="var(--lcars-senary)"
        >
          {entries.publishedMissions.length === 0 ? (
            <p className="lcars-empty-state">Noch keine Missionen vorhanden.</p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.publishedMissions.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <Link
                    href={`/missions/${m.slug}`}
                    className="mission-akte flex-1"
                    style={
                      {
                        "--mission-color": "var(--lcars-senary)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">
                        {m.title}
                      </span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Zeitraum</b>{" "}
                          {periodLabel(m.started_at, m.ended_at)}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <ContentActionRow
                    editHref={`/user/missions/${m.id}/edit`}
                    deleteButton={
                      <DeleteOwnContentButton
                        contentType="mission"
                        id={m.id}
                        onOptimisticDelete={() => removeOptimisticMission(m.id)}
                      />
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </LcarsDataRow>
      )}
    </div>
  );
}

"use client";
import { useMemo, useOptimistic, useState } from "react";
import { LcarsAkteCard, LcarsDataRow } from "@/components/lcars";
import type { UserContentLog } from "@/lib/characters";
import type { DialogueSummary } from "@/lib/dialoguesCore";
import type { UserContentArchiveEntry } from "@/lib/archive";
import { fmtDate, sessionLabel, periodLabel } from "@/lib/missionFormat";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import type { MissionPreview } from "@/types/missions";
import VisibilitySelect from "./VisibilitySelect";
import DeleteOwnContentButton from "./DeleteOwnContentButton";
import ContentActionRow from "./ContentActionRow";
import { LcarsListFilterInput } from "@/components/lcars";

// Charaktere sind bewusst KEINE Kategorie mehr: sie haben mit
// /user/characters eine eigene Übersicht (inkl. Werte-Formular). Die
// Charakter-LISTE kommt trotzdem weiterhin herein — sie speist den
// Charakter-Filter für Einsatzberichte/Gespräche unten. Bewusst nur
// {slug,name} statt ganzer Character-Objekte: die tragen mit keepStats den
// kompletten Werte-Teilbaum (siehe getCharactersForUser), der sonst
// ungenutzt im RSC-Payload dieser Client-Komponente landete — genau das,
// wogegen parseCharacter sein stripStats hat.
export interface ContentFilterCharacter {
  slug: string;
  name: string;
}
type CategoryFilter = "all" | "logs" | "dialogues" | "archive" | "missions";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "Alle Kategorien",
  logs: "Einsatzberichte",
  dialogues: "Gespräche",
  archive: "Datenbank-Einträge",
  missions: "Missionen",
};

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
  characters: ContentFilterCharacter[];
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
    draftLogs.length +
    draftArchiveEntries.length +
    (canManageMissions ? draftMissions.length : 0);

  const total =
    logs.length +
    dialogues.length +
    archiveEntries.length +
    (canManageMissions ? missions.length : 0);

  const [query, setQuery] = useState("");
  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return {
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
            {canManageMissions &&
              entries.draftMissions.map((m) => (
                <div
                  key={`mission-${m.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <LcarsAkteCard
                    href={`/missions/${m.slug}`}
                    color="var(--lcars-quinary)"
                    className="flex-1"
                    title={m.title}
                    meta={
                      <>
                        <span>
                          <b>Typ</b> Mission
                        </span>
                      </>
                    }
                  />
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
                <LcarsAkteCard
                  href={`/missions/${log.mission_slug}/${log.slug}`}
                  color="var(--lcars-quinary)"
                  className="flex-1"
                  title={log.title}
                  meta={
                    <>
                      <span>
                        <b>Typ</b> Einsatzbericht
                      </span>
                      <span>
                        <b>Mission</b> {log.mission_title}
                      </span>
                    </>
                  }
                />
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
                <LcarsAkteCard
                  href={`/archive/${entry.slug}`}
                  color="var(--lcars-quinary)"
                  className="flex-1"
                  title={entry.title}
                  meta={
                    <>
                      <span>
                        <b>Typ</b> Datenbank-Eintrag
                      </span>
                      <span>
                        <b>Kategorie</b> {CATEGORY_CONFIG[entry.category].label}
                      </span>
                    </>
                  }
                />
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
                  <LcarsAkteCard
                    href={`/missions/${log.mission_slug}/${log.slug}`}
                    color="var(--lcars-tertiary)"
                    className="flex-1"
                    title={log.title}
                    meta={
                      <>
                        <span>
                          <b>Session</b> {sessionLabel(log.session_nr)}
                        </span>
                        <span>
                          <b>Datum</b> {fmtDate(log.log_date)}
                        </span>
                        <span>
                          <b>Mission</b> {log.mission_title}
                        </span>
                      </>
                    }
                  />
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
                  <LcarsAkteCard
                    href={
                      d.open
                        ? `/dialogues/${d.slug}`
                        : `/characters/dialogues/${d.slug}`
                    }
                    color={
                      d.open ? "var(--lcars-senary)" : "var(--lcars-quinary)"
                    }
                    className="flex-1"
                    title={d.title}
                    meta={
                      <>
                        <span>
                          <b>Gesprächspartner</b> {d.partnerName}
                        </span>
                        <span>
                          <b>Status</b> {d.open ? "Offen" : "Abgeschlossen"}
                        </span>
                      </>
                    }
                  />
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
          label="Datenbank-Einträge"
          color="var(--lcars-secondary)"
        >
          {entries.publishedArchiveEntries.length === 0 ? (
            <p className="lcars-empty-state">
              Noch keine eigenen Datenbank-Einträge vorhanden.
            </p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.publishedArchiveEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
                >
                  <LcarsAkteCard
                    href={`/archive/${entry.slug}`}
                    color="var(--lcars-secondary)"
                    className="flex-1"
                    title={entry.title}
                    meta={
                      <>
                        <span>
                          <b>Kategorie</b>{" "}
                          {CATEGORY_CONFIG[entry.category].label}
                        </span>
                      </>
                    }
                  />
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
                  <LcarsAkteCard
                    href={`/missions/${m.slug}`}
                    color="var(--lcars-senary)"
                    className="flex-1"
                    title={m.title}
                    meta={
                      <>
                        <span>
                          <b>Zeitraum</b>{" "}
                          {periodLabel(m.started_at, m.ended_at)}
                        </span>
                      </>
                    }
                  />
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

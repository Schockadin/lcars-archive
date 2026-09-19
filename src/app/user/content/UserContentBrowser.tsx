"use client";
import { Fragment, useMemo, useOptimistic, useState } from "react";
import {
  LcarsListFilterInput,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import ChronoRow from "@/components/timeline/ChronoRow";
import ChronoCard from "@/components/timeline/ChronoCard";
import type { UserContentLog } from "@/lib/characters";
import type { DialogueSummary } from "@/lib/dialoguesCore";
import type { UserContentArchiveEntry } from "@/lib/archive";
import { fmtDate, sessionLabel, periodLabel } from "@/lib/missionFormat";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import {
  CONTENT_TYPE_COLOR,
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_LABEL_PLURAL,
  CONTENT_DRAFT_COLOR,
} from "@/lib/contentTypeFormat";
import type { MissionPreview } from "@/types/missions";
import ContentStateSelect from "./ContentStateSelect";
import DeleteOwnContentButton from "./DeleteOwnContentButton";
import ContentActionRow from "./ContentActionRow";
import ContentLinkToolButton from "@/components/ContentLinkToolButton";
import {
  archiveEditHref,
  archiveHref,
  dialogueHref,
  missionEditHref,
  missionHref,
  missionLogEditHref,
  missionLogHref,
} from "@/lib/contentRoutes";

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

// Die Inhaltsarten dieser Seite. „dialogue" ist kein eigener Owner-Typ (ein
// Gespräch ist ein archive_entry der Kategorie „dialogue"), wird hier aber
// wie überall getrennt ausgewiesen.
type ContentKind = "mission_log" | "dialogue" | "archive_entry" | "mission";

// Reihenfolge der Abschnitte bei der Sortierung nach Kategorie — von dem,
// was beim Spielen entsteht, zu dem, was die Runde verwaltet.
const KIND_ORDER: ContentKind[] = [
  "mission_log",
  "dialogue",
  "archive_entry",
  "mission",
];

type CategoryFilter = "all" | ContentKind | "drafts";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "Alle Kategorien",
  drafts: "Nur Entwürfe",
  mission_log: CONTENT_TYPE_LABEL_PLURAL.mission_log,
  dialogue: CONTENT_TYPE_LABEL_PLURAL.dialogue,
  archive_entry: CONTENT_TYPE_LABEL_PLURAL.archive_entry,
  mission: CONTENT_TYPE_LABEL_PLURAL.mission,
};

type SortKey = "category" | "title";

// Eine Zeile der Liste, aus allen vier Inhaltsarten auf dieselbe Form
// gebracht: So sortiert und gruppiert der Rest dieser Datei ÜBER die Arten
// hinweg, statt für jede eine eigene Liste zu führen.
interface ContentItem {
  key: string;
  kind: ContentKind;
  title: string;
  href: string;
  isDraft: boolean;
  // Farbe des Punktes an der Schiene: die Farbe der Inhaltsart, bei einem
  // Entwurf die Zustandsfarbe (CONTENT_DRAFT_COLOR) — an ihr erkennt man auf
  // der ganzen Seite, was noch nicht veröffentlicht ist.
  color: string;
  // Zum Filtern nach Charakter (Einsatzberichte/Gespräche); die übrigen
  // Arten hängen am Owner, nicht an einer Figur.
  characterSlug?: string;
  meta: React.ReactNode;
  actions: React.ReactNode;
}

// „Meine Inhalte": EINE Liste über alle Inhaltsarten, im Aufbau der
// Chronologie und der Datenbank — Abschnittsüberschrift, Schiene mit Punkt,
// Karte (siehe ChronoRow/ChronoCard). Vorher war jede Art ein eigenes
// Akkordeon (LcarsDataRow), das man einzeln aufklappen musste, und Entwürfe
// lagen in einem sechsten darüber; wer wissen wollte, was er zuletzt
// angefasst hat, klickte sich durch fünf Klappen.
//
// Vorgabe ist die Sortierung nach Kategorie (Abschnitte in KIND_ORDER),
// alternativ alphabetisch über alles. Entwürfe stehen jetzt in ihrer
// Kategorie — erkennbar an der Farbe, dem Etikett und dem Umschalter in der
// Zeile; der Kategorie-Filter hat dafür den Eintrag „Nur Entwürfe".
export default function UserContentBrowser({
  characters,
  logs,
  dialogues,
  archiveEntries,
  missions,
  canManageMissions,
  canLinkAnyContent = false,
  ownUserId,
}: {
  characters: ContentFilterCharacter[];
  logs: UserContentLog[];
  dialogues: DialogueSummary[];
  archiveEntries: UserContentArchiveEntry[];
  missions: MissionPreview[];
  canManageMissions: boolean;
  // Trägt die Person content.autolink_tools? Logbücher und Datenbank-Einträge
  // dieser Seite gehören ihr ohnehin selbst (getLogsForUser/
  // getArchiveEntriesForUser) — dort braucht es das Recht nicht. Die
  // Missionsliste zeigt der Spielleitung dagegen ALLE Missionen
  // (getAllMissionsIncludingDrafts), auch fremde: dort steht das Werkzeug
  // deshalb nur mit dem Recht, sonst stünde da ein Knopf, den der Server
  // ablehnt (mayUseContentTools in src/app/actions/contentTools.ts).
  canLinkAnyContent?: boolean;
  ownUserId: number;
}) {
  const [characterFilter, setCharacterFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [query, setQuery] = useState("");

  // Missionen sind eine eigene Kategorie, aber nur für Admin/GM sichtbar
  // (siehe canManageMissions) — kein Owner-/Charakter-Konzept wie bei den
  // anderen Kategorien, deshalb auch vom Charakter-Filter unberührt.
  const visibleCategoryKeys = (
    Object.keys(CATEGORY_LABELS) as CategoryFilter[]
  ).filter((key) => key !== "mission" || canManageMissions);

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

  const items = useMemo<ContentItem[]>(() => {
    const dotColor = (kind: ContentKind, isDraft: boolean) =>
      isDraft ? CONTENT_DRAFT_COLOR : CONTENT_TYPE_COLOR[kind];

    const logItems: ContentItem[] = optimisticLogs.map((log) => ({
      key: `mission_log-${log.id}`,
      kind: "mission_log",
      title: log.title,
      href: missionLogHref(log.mission_slug, log.slug),
      isDraft: log.is_draft,
      color: dotColor("mission_log", log.is_draft),
      characterSlug: log.character_slug,
      meta: (
        <>
          <span>
            <b>Mission</b> {log.mission_title}
          </span>
          <span>
            <b>Session</b> {sessionLabel(log.session_nr)}
          </span>
          {log.log_date && (
            <span>
              <b>Datum</b> {fmtDate(log.log_date)}
            </span>
          )}
          <span>
            <b>Figur</b> {log.character_name}
          </span>
        </>
      ),
      actions: (
        <ContentActionRow
          state={
            <ContentStateSelect
              contentType="mission_log"
              id={log.id}
              isDraft={log.is_draft}
            />
          }
          extraAction={
            <ContentLinkToolButton
              contentType="missionLog"
              slug={log.slug}
              detectMode={false}
            />
          }
          editHref={missionLogEditHref(log.id)}
          deleteButton={
            <DeleteOwnContentButton
              contentType="mission_log"
              id={log.id}
              onOptimisticDelete={() => removeOptimisticLog(log.id)}
            />
          }
        />
      ),
    }));

    const dialogueItems: ContentItem[] = optimisticDialogues.map((d) => ({
      key: `dialogue-${d.id}`,
      kind: "dialogue",
      title: d.title,
      href: d.open ? dialogueHref(d.slug) : `/characters/dialogues/${d.slug}`,
      isDraft: d.isDraft,
      color: dotColor("dialogue", d.isDraft),
      characterSlug: d.characterSlug,
      meta: (
        <>
          <span>
            <b>Gesprächspartner</b> {d.partnerName}
          </span>
          <span>
            <b>Status</b> {d.open ? "Offen" : "Abgeschlossen"}
          </span>
          <span>
            <b>Figur</b> {d.characterName}
          </span>
        </>
      ),
      // Umschalten/Löschen kann nur, wer das Gespräch begonnen hat
      // (owner_user_id) — die Gegenseite sieht nur den Stand.
      actions:
        d.ownerUserId === ownUserId ? (
          <ContentActionRow
            state={
              <ContentStateSelect
                contentType="dialogue"
                id={d.id}
                isDraft={d.isDraft}
              />
            }
            deleteButton={
              <DeleteOwnContentButton
                contentType="dialogue"
                id={d.id}
                onOptimisticDelete={() => removeOptimisticDialogue(d.id)}
              />
            }
          />
        ) : null,
    }));

    const archiveItems: ContentItem[] = optimisticArchiveEntries.map(
      (entry) => ({
        key: `archive_entry-${entry.id}`,
        kind: "archive_entry",
        title: entry.title,
        href: archiveHref(entry.slug),
        isDraft: entry.isDraft,
        color: dotColor("archive_entry", entry.isDraft),
        meta: (
          <span>
            <b>Kategorie</b> {CATEGORY_CONFIG[entry.category].label}
          </span>
        ),
        actions: (
          <ContentActionRow
            state={
              <ContentStateSelect
                contentType="archive_entry"
                id={entry.id}
                isDraft={entry.isDraft}
              />
            }
            extraAction={
              <ContentLinkToolButton
                contentType="archiveEntry"
                slug={entry.slug}
                detectMode={false}
              />
            }
            editHref={archiveEditHref(entry.id)}
            deleteButton={
              <DeleteOwnContentButton
                contentType="archive_entry"
                id={entry.id}
                onOptimisticDelete={() => removeOptimisticArchiveEntry(entry.id)}
              />
            }
          />
        ),
      }),
    );

    const missionItems: ContentItem[] = canManageMissions
      ? optimisticMissions.map((m) => ({
          key: `mission-${m.id}`,
          kind: "mission",
          title: m.title,
          href: missionHref(m.slug),
          isDraft: m.isDraft,
          color: dotColor("mission", m.isDraft),
          meta: (
            <span>
              <b>Zeitraum</b> {periodLabel(m.started_at, m.ended_at)}
            </span>
          ),
          actions: (
            <ContentActionRow
              extraAction={
                canLinkAnyContent ? (
                  <ContentLinkToolButton
                    contentType="mission"
                    slug={m.slug}
                    detectMode={false}
                  />
                ) : undefined
              }
              editHref={missionEditHref(m.id)}
              deleteButton={
                <DeleteOwnContentButton
                  contentType="mission"
                  id={m.id}
                  onOptimisticDelete={() => removeOptimisticMission(m.id)}
                />
              }
            />
          ),
        }))
      : [];

    return [...logItems, ...dialogueItems, ...archiveItems, ...missionItems];
  }, [
    optimisticLogs,
    optimisticDialogues,
    optimisticArchiveEntries,
    optimisticMissions,
    canManageMissions,
    canLinkAnyContent,
    ownUserId,
    removeOptimisticLog,
    removeOptimisticDialogue,
    removeOptimisticArchiveEntry,
    removeOptimisticMission,
  ]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) =>
        categoryFilter === "all"
          ? true
          : categoryFilter === "drafts"
            ? item.isDraft
            : item.kind === categoryFilter,
      )
      .filter(
        (item) =>
          !characterFilter ||
          item.characterSlug === undefined ||
          item.characterSlug === characterFilter,
      )
      .filter((item) => !q || item.title.toLowerCase().includes(q))
      .sort((a, b) => {
        const byTitle = a.title.localeCompare(b.title, "de");
        const comparison =
          sortKey === "title"
            ? byTitle
            : KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || byTitle;
        return sortDir === "asc" ? comparison : -comparison;
      });
  }, [items, categoryFilter, characterFilter, query, sortKey, sortDir]);

  if (items.length === 0) {
    return <p className="lcars-empty-state">Noch keine Inhalte vorhanden.</p>;
  }

  return (
    <div>
      <div className="lcars-toolbar">
        <LcarsSortSwitch
          className="mission-sort"
          options={[
            { key: "category", label: "Kategorie" },
            { key: "title", label: "Alphabetisch" },
          ]}
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(key, direction) => {
            setSortKey(key as SortKey);
            setSortDir(direction);
          }}
        />
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Einträge filtern"
        />
        {characters.length > 0 && (
          <select
            className="mission-author-filter rounded-full"
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
        )}
        <select
          className="mission-author-filter rounded-full"
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

      {list.length === 0 ? (
        <p className="lcars-empty-state">Keine Einträge für diesen Filter.</p>
      ) : (
        <>
          <div className="archive-entry-list">
            {list.map((item, index) => {
              // Abschnitte nur bei der Sortierung nach Kategorie — alphabetisch
              // sortiert wäre eine Überschrift je Zeile, und die Liste soll
              // dann durchlaufen wie die Datenbank unter einem Buchstaben.
              const previous = index > 0 ? list[index - 1] : null;
              const startsSection =
                sortKey === "category" &&
                (!previous || previous.kind !== item.kind);

              return (
                <Fragment key={item.key}>
                  {startsSection && (
                    <h2 className="timeline-period archive-letter-period">
                      {CONTENT_TYPE_LABEL_PLURAL[item.kind]}
                    </h2>
                  )}
                  <ChronoRow color={item.color}>
                    <div className="flex flex-1 flex-col gap-[8px] sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <ChronoCard
                          color={item.color}
                          tag={
                            item.isDraft
                              ? `${CONTENT_TYPE_LABEL[item.kind]} · Entwurf`
                              : CONTENT_TYPE_LABEL[item.kind]
                          }
                          title={item.title}
                          href={item.href}
                          ariaLabel={`${item.title} — ${CONTENT_TYPE_LABEL[item.kind]}`}
                          meta={item.meta}
                        />
                      </div>
                      {item.actions}
                    </div>
                  </ChronoRow>
                </Fragment>
              );
            })}
          </div>
          <p className="lcars-eyebrow mt-[12px]">
            {list.length === items.length
              ? `${items.length} Einträge`
              : `${list.length} von ${items.length} Einträgen`}
          </p>
        </>
      )}
    </div>
  );
}

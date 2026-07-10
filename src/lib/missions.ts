import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { renderContentHtml } from "@/lib/autolink";
import {
  LogNavItem,
  LogNavNeighbors,
  LogPath,
  MissionDetail,
  MissionLogDetail,
  MissionLogListItem,
  MissionMetaData,
  MissionParticipant,
  MissionPreview,
  MissionStatus,
} from "@/types/missions";

// metadata kommt als JSONB-String aus der DB — wie bei den Charakteren
// (vgl. parseCharacter) muss sie zum Objekt geparst werden.
function parseMeta<T extends { metadata: MissionMetaData }>(row: T): T {
  return {
    ...row,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as MissionMetaData)
        : row.metadata,
  };
}

// Alle Missionen für die Übersicht — neueste zuerst.
// Die Anzahl der Mission-Logs wird per LEFT JOIN mitgezählt, damit
// auch Missionen ohne Logs (log_count = 0) erscheinen.
// Persistenter Cache bis zur Tag-Invalidierung (hängt an missions + mission-logs,
// da log_count mitgezählt wird).
export const getAllMissions = unstable_cache(
  async (): Promise<MissionPreview[]> => {
    const rows = await sql<MissionPreview[]>`
      SELECT
        m.id,
        m.slug,
        m.title,
        m.status,
        m.metadata,
        m.started_at::text         AS started_at,
        m.ended_at::text           AS ended_at,
        COUNT(DISTINCT ml.id)::int AS log_count,
        COALESCE(
          jsonb_agg(DISTINCT jsonb_build_object('name', c.name, 'slug', c.slug))
            FILTER (WHERE c.id IS NOT NULL),
          '[]'::jsonb
        ) AS authors
      FROM missions m
      LEFT JOIN mission_logs ml ON ml.mission_id = m.id
      LEFT JOIN characters c    ON c.id = ml.author_id
      GROUP BY m.id
      ORDER BY m.started_at DESC NULLS LAST, m.created_at DESC
    `;
    return rows.map(parseMeta);
  },
  ["getAllMissions"],
  { tags: [cacheTags.missions, cacheTags.missionLogs] },
);

type MissionRow = Omit<MissionDetail, "participants">;

async function getMissionParticipants(
  missionId: number,
): Promise<MissionParticipant[]> {
  return sql<MissionParticipant[]>`
    SELECT c.slug, c.name
    FROM mission_participants mp
    JOIN characters c ON c.id = mp.character_id
    WHERE mp.mission_id = ${missionId}
    ORDER BY c.name ASC
  `;
}

// Charakter-IDs (nicht Slug/Name wie getMissionParticipants oben) — Grundlage
// für die vorbelegten Checkboxen im Bearbeiten-Formular
// (MissionParticipantsField.tsx defaultSelectedIds).
export async function getMissionParticipantIds(
  missionId: number,
): Promise<number[]> {
  const rows = await sql<{ character_id: number }[]>`
    SELECT character_id FROM mission_participants WHERE mission_id = ${missionId}
  `;
  return rows.map((r) => r.character_id);
}

// Eine Mission per Slug. Persistenter Cache, getaggt mit missions + mission:<slug>.
// unstable_cache dedupliziert auch innerhalb eines Requests (Layout + Page
// fragen dieselbe Mission ab), ersetzt also das frühere React-cache().
export async function getMissionBySlug(
  slug: string,
): Promise<MissionDetail | null> {
  return unstable_cache(
    async (): Promise<MissionDetail | null> => {
      const rows = await sql<MissionRow[]>`
        SELECT
          id,
          slug,
          title,
          status,
          started_at::text AS started_at,
          ended_at::text   AS ended_at,
          metadata,
          updated_at::text AS updated_at,
          owner_user_id    AS "ownerUserId",
          source_md        AS "sourceMarkdown"
        FROM missions
        WHERE slug = ${slug}
        LIMIT 1
      `;
      if (!rows[0]) return null;
      const mission = parseMeta(rows[0]);
      const participants = await getMissionParticipants(mission.id);
      return { ...mission, participants };
    },
    ["getMissionBySlug", "v4", slug],
    { tags: [cacheTags.missions, cacheTags.mission(slug)] },
  )();
}

// Eine Mission per numerischer ID — für den Admin/GM-Editier-Weg
// (/users/[id]/missions/[missionId]/edit), wo die ID aus der Route kommt
// statt aus dem Slug. Bewusst ohne Cache (wie getOwnMissionLogForEdit):
// das Formular soll immer den aktuellen Stand zeigen.
export async function getMissionById(
  id: number,
): Promise<MissionDetail | null> {
  const rows = await sql<MissionRow[]>`
    SELECT
      id,
      slug,
      title,
      status,
      started_at::text AS started_at,
      ended_at::text   AS ended_at,
      metadata,
      updated_at::text AS updated_at,
      owner_user_id    AS "ownerUserId",
      source_md        AS "sourceMarkdown"
    FROM missions
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const mission = parseMeta(rows[0]);
  const participants = await getMissionParticipants(mission.id);
  return { ...mission, participants };
}

// Ersetzt die komplette Teilnehmerliste einer Mission (Multiselect beim
// Anlegen/Bearbeiten, siehe MissionParticipantsField.tsx) — DELETE+INSERT
// statt Diff, da die Liste bei jedem Speichern vollständig aus dem Formular
// kommt (keine Teilmenge). Kein Owner-Scoping nötig: nur admin/gm erreichen
// missionAction überhaupt (siehe contentAction.ts).
export async function setMissionParticipants(
  missionId: number,
  characterIds: number[],
): Promise<void> {
  await sql`DELETE FROM mission_participants WHERE mission_id = ${missionId}`;
  if (characterIds.length === 0) return;

  const rows = characterIds.map((characterId) => ({
    mission_id: missionId,
    character_id: characterId,
  }));
  await sql`
    INSERT INTO mission_participants ${sql(rows, "mission_id", "character_id")}
    ON CONFLICT DO NOTHING
  `;
}

// Distinct Spieler (player_id) der teilnehmenden Charaktere — Grundlage für
// die Teilnehmer-Benachrichtigung beim Anlegen einer Mission
// (missionAction). Unabhängig von einem Mission-Abo, das hier bewusst NICHT
// automatisch gesetzt wird (siehe Kommentar an mission_participants in
// schema.sql) — die Benachrichtigung selbst enthält stattdessen einen Link,
// um das Abo zu aktivieren.
export async function getMissionParticipantUsers(
  characterIds: number[],
): Promise<
  {
    id: number;
    email: string;
    name: string;
    emailNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
  }[]
> {
  if (characterIds.length === 0) return [];

  const rows = await sql<
    {
      id: number;
      email: string;
      name: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
    }[]
  >`
    SELECT DISTINCT u.id, u.email, u.name, u.email_notifications_enabled, u.push_notifications_enabled
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.id = ANY(${characterIds})
  `;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    emailNotificationsEnabled: row.email_notifications_enabled,
    pushNotificationsEnabled: row.push_notifications_enabled,
  }));
}

// Kollisionsprüfung vor dem Anlegen einer neuen Mission (analog
// missionLogSlugExists) — der Slug wird aus dem Titel abgeleitet oder frei
// vergeben.
export async function missionSlugExists(slug: string): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM missions WHERE slug = ${slug}) AS exists
  `;
  return row?.exists ?? false;
}

// Legt eine neue Mission direkt in der DB an (DB ist alleinige Source of
// Truth, siehe createMissionAction in .../missions/new/actions.ts).
export async function createMission(input: {
  slug: string;
  title: string;
  status: MissionStatus;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  teaser: string | null;
  bodyMarkdown: string;
  ownerUserId: number;
  // Vorgerendertes HTML überspringt das eigene renderContentHtml() — genutzt
  // vom Opt-in "Automatisch verlinken" (createMissionAction), das den
  // Markdown-Text vorab per autoLinkMarkdown() transformiert UND rendert,
  // damit frisch gesetzte Wikilinks sofort aufgelöst sind (siehe
  // resolveAutolinkedWikilinks in src/lib/autolink.ts) statt beim eigenen
  // Rendern hier erneut aufgelöst zu werden (harmlos, aber unnötig).
  bodyHtml?: string;
}): Promise<{ id: number; slug: string }> {
  const bodyHtml = input.bodyHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<{ id: number; slug: string }[]>`
    INSERT INTO missions (
      slug, title, status, started_at, ended_at, metadata, source_md,
      owner_user_id, updated_at
    ) VALUES (
      ${input.slug},
      ${input.title},
      ${input.status},
      ${input.startedAt},
      ${input.endedAt},
      ${sql.json({ tags: input.tags, body: bodyHtml, teaser: input.teaser })},
      ${input.bodyMarkdown},
      ${input.ownerUserId},
      NOW()
    )
    RETURNING id, slug
  `;
  return rows[0];
}

export interface UpdateMissionResult {
  slug: string;
  ownerSlug: string | null;
}

// Vollständige Bearbeitung einer Mission (Admin/GM-Formular unter
// /users/[id]/missions/[missionId]/edit). Der Slug bleibt unveränderlich
// (Identitätsfeld, siehe updateMissionLogContent oben für dasselbe Prinzip
// bei Logs) — er bildet sowohl den Vault-Ordnernamen als auch die
// mission_slug-Referenz bestehender Mission-Logs.
export async function updateMissionContent(
  missionId: number,
  input: {
    title: string;
    status: MissionStatus;
    startedAt: string | null;
    endedAt: string | null;
    tags: string[];
    teaser: string | null;
    bodyMarkdown: string;
    // Siehe createMission oben — Opt-in "Automatisch verlinken".
    bodyHtml?: string;
  },
): Promise<UpdateMissionResult | null> {
  const bodyHtml = input.bodyHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<UpdateMissionResult[]>`
    UPDATE missions m
    SET
      title      = ${input.title},
      status     = ${input.status},
      started_at = ${input.startedAt},
      ended_at   = ${input.endedAt},
      metadata   = ${sql.json({ tags: input.tags, body: bodyHtml, teaser: input.teaser })},
      source_md  = ${input.bodyMarkdown},
      updated_at = NOW()
    WHERE m.id = ${missionId}
    RETURNING
      m.slug,
      (SELECT slug FROM users WHERE id = m.owner_user_id) AS "ownerSlug"
  `;
  return rows[0] ?? null;
}

export interface UpdateMissionSynopsisResult {
  slug: string;
  metadata: MissionMetaData;
}

// Nur-Synopsis-Bearbeitung (inline auf /missions/[slug], MissionSynopsisEditor)
// — Titel/Status/Zeitraum/Tags bleiben unangetastet, deshalb reicht slug +
// die aktualisierte metadata als Rückgabe.
export async function updateMissionSynopsis(
  missionId: number,
  bodyMarkdown: string,
): Promise<UpdateMissionSynopsisResult | null> {
  const bodyHtml = await renderContentHtml(bodyMarkdown);

  const rows = await sql<
    (Omit<UpdateMissionSynopsisResult, "metadata"> & {
      metadata: MissionMetaData | string;
    })[]
  >`
    UPDATE missions m
    SET
      metadata   = jsonb_set(m.metadata, '{body}', to_jsonb(${bodyHtml}::text)),
      source_md  = ${bodyMarkdown},
      updated_at = NOW()
    WHERE m.id = ${missionId}
    RETURNING m.slug, m.metadata
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    metadata:
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as MissionMetaData)
        : row.metadata,
  };
}

// Für die Admin-Action "Autolinking" (src/app/actions/autolink.ts) — anders
// als updateMissionSynopsis oben wird bodyHtml NICHT hier gerendert, sondern
// vom Aufrufer übergeben: der muss zwischen Rendern und Speichern noch die
// frisch erstellten [[Wikilinks]] auflösen (resolveAutolinkedWikilinks),
// was updateMissionSynopsis selbst nicht kann.
export async function updateMissionSynopsisWithHtml(
  missionId: number,
  bodyMarkdown: string,
  bodyHtml: string,
): Promise<void> {
  await sql`
    UPDATE missions m
    SET
      metadata   = jsonb_set(m.metadata, '{body}', to_jsonb(${bodyHtml}::text)),
      source_md  = ${bodyMarkdown},
      updated_at = NOW()
    WHERE m.id = ${missionId}
  `;
}

// Aktuellstes log_date über alle Mission-Logs hinweg — Vorschlagswert für
// Datumsfelder in "Neuer Missionslog"/"Neue Mission"/"Neues Gespräch"
// (siehe die jeweiligen new/page.tsx), da die Kampagne einem fiktiven
// In-Story-Kalender folgt statt dem realen Datum. null, wenn es noch
// keinen einzigen Mission-Log gibt (dann bleibt das jeweilige Feld leer).
// Kein Cache, gleiche Begründung wie getNextSessionNr unten.
export async function getMostRecentLogDate(): Promise<string | null> {
  const [row] = await sql<{ log_date: string | null }[]>`
    SELECT MAX(log_date)::text AS log_date FROM mission_logs
  `;
  return row?.log_date ?? null;
}

// Vorschlagswert fürs Session-Nr-Feld im "Neuer Missionslog"-Formular
// (src/app/users/[id]/mission-logs/new) — nur ein Default, das Feld bleibt
// editierbar. Kein Cache: soll bei jedem Seitenaufruf den aktuellen Stand
// zeigen, nicht bis zur nächsten Tag-Invalidierung stale bleiben.
export async function getNextSessionNr(
  missionId: number,
  authorId: number,
): Promise<number> {
  const [row] = await sql<{ next: number }[]>`
    SELECT COALESCE(MAX(session_nr), 0) + 1 AS next
    FROM mission_logs
    WHERE mission_id = ${missionId} AND author_id = ${authorId}
  `;
  return row?.next ?? 1;
}

// Legt einen neuen Mission-Log direkt in der DB an (siehe createMission
// oben — gleiches Prinzip: DB ist alleinige Source of Truth).
export async function createMissionLog(input: {
  slug: string;
  missionId: number;
  authorId: number;
  title: string;
  bodyMarkdown: string;
  logDate: string | null;
  sessionNr: number;
  tags: string[];
  ownerUserId: number | null;
  // Siehe createMission oben — Opt-in "Automatisch verlinken".
  contentHtml?: string;
}): Promise<{ id: number; slug: string }> {
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<{ id: number; slug: string }[]>`
    INSERT INTO mission_logs (
      slug, mission_id, author_id, title, content, log_date, session_nr,
      metadata, source_md, owner_user_id, updated_at
    ) VALUES (
      ${input.slug},
      ${input.missionId},
      ${input.authorId},
      ${input.title},
      ${contentHtml},
      ${input.logDate},
      ${input.sessionNr},
      ${sql.json({ tags: input.tags })},
      ${input.bodyMarkdown},
      ${input.ownerUserId},
      NOW()
    )
    RETURNING id, slug
  `;
  return rows[0];
}

// Kollisionsprüfung vor dem Anlegen eines neuen Mission-Logs
// (src/app/users/[id]/mission-logs/new/actions.ts) — der Slug ist
// deterministisch aus author-mission-session_nr gebaut, ein Treffer
// bedeutet also "diese Kombination gibt es schon".
export async function missionLogSlugExists(slug: string): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM mission_logs WHERE slug = ${slug}) AS exists
  `;
  return row?.exists ?? false;
}

// Logs einer Mission (schlank, ohne content) für die Liste links. Nur
// public — diese Nav-Liste wird auf jeder Log-Detailseite der Mission
// mitgerendert (auch auf privaten/gm-Logs, siehe Layout), ein
// nicht-public Log würde sonst dort für jeden Betrachter im Titel auftauchen.
export async function getLogsByMissionId(
  missionId: number,
): Promise<MissionLogListItem[]> {
  return unstable_cache(
    async (): Promise<MissionLogListItem[]> => {
      const rows = await sql<MissionLogListItem[]>`
        SELECT
          ml.id,
          ml.slug,
          ml.title,
          ml.session_nr,
          ml.log_date::text AS log_date,
          c.name AS author_name,
          c.slug AS author_slug
        FROM mission_logs ml
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.mission_id = ${missionId} AND ml.visibility = 'public'
        ORDER BY ml.session_nr DESC NULLS LAST, ml.created_at DESC
      `;
      return rows;
    },
    ["getLogsByMissionId", "v2", String(missionId)],
    { tags: [cacheTags.missionLogs, cacheTags.missionLogsOf(missionId)] },
  )();
}

// Ein vollständiges Log per Slug (global eindeutig) inkl. Mission-Referenz.
export async function getLogBySlug(
  slug: string,
): Promise<MissionLogDetail | null> {
  return unstable_cache(
    async (): Promise<MissionLogDetail | null> => {
      const rows = await sql<MissionLogDetail[]>`
        SELECT
          ml.id,
          ml.slug,
          ml.title,
          ml.content,
          ml.session_nr,
          ml.log_date::text AS log_date,
          c.name  AS author_name,
          c.slug  AS author_slug,
          m.id    AS mission_id,
          m.slug  AS mission_slug,
          m.title AS mission_title,
          ml.visibility,
          ml.owner_user_id AS "ownerUserId"
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.slug = ${slug}
        LIMIT 1
      `;
      return rows[0] ?? null;
    },
    ["getLogBySlug", "v2", slug],
    { tags: [cacheTags.missionLogs, cacheTags.log(slug)] },
  )();
}

// Vor-/Zurück-Navigation zwischen den Logs desselben Autors. Sortiert
// chronologisch nach Datum → Session-Nr (Logs ohne Datum/Session ans Ende);
// prev = das ältere, next = das neuere Nachbar-Log. Gibt {null,null} zurück,
// wenn der Autor unbekannt ist oder das Log nicht (mehr) zum Autor gehört.
export async function getAuthorLogNav(
  authorSlug: string,
  currentSlug: string,
): Promise<LogNavNeighbors> {
  return unstable_cache(
    async (): Promise<LogNavNeighbors> => {
      const logs = await sql<LogNavItem[]>`
        SELECT
          ml.slug,
          m.slug  AS mission_slug,
          ml.title,
          ml.session_nr,
          ml.log_date::text AS log_date
        FROM mission_logs ml
        JOIN missions m   ON m.id = ml.mission_id
        JOIN characters c ON c.id = ml.author_id
        WHERE c.slug = ${authorSlug}
        ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST, ml.id ASC
      `;

      const i = logs.findIndex((l) => l.slug === currentSlug);
      if (i === -1) return { prev: null, next: null };
      return {
        prev: logs[i - 1] ?? null,
        next: logs[i + 1] ?? null,
      };
    },
    ["getAuthorLogNav", authorSlug, currentSlug],
    { tags: [cacheTags.missionLogs, cacheTags.character(authorSlug)] },
  )();
}

// Nur der Owner (Spieler des Autor-Charakters, via Join — Mission-Logs haben
// kein eigenes direktes user_id-Feld) darf die Sichtbarkeit ändern; ein
// fremdes/gefälschtes id trifft dann einfach 0 Zeilen.
// Admin-Owner-Verwaltung (src/app/actions/owner.ts): anders als
// setMissionLogVisibility unten NICHT auf den aktuellen Owner gescoped —
// die Berechtigungsprüfung (nur admin) passiert ausschließlich in der
// Server Action, hier reicht die ID.
export async function setMissionOwner(
  missionId: number,
  ownerId: number | null,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE missions
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE id = ${missionId}
    RETURNING slug
  `;
  return rows[0] ?? null;
}

// Bulk-Variante von setMissionOwner: weist ALLE Missionen ohne Owner (meist
// per Vault-Ingest entstanden, der owner_user_id nie setzt) auf einen Schlag
// einem GM zu (siehe assignOwnerlessMissionsAction in
// src/app/users/missionOwnerActions.ts) — spart das mühsame Einzeln-Zuordnen
// über OwnerSelect.tsx auf jeder Mission-Detailseite. Bereits zugeordnete
// Missionen bleiben unangetastet (WHERE owner_user_id IS NULL).
export async function assignOwnerlessMissionsToUser(
  ownerId: number,
): Promise<{ slugs: string[] }> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE missions
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE owner_user_id IS NULL
    RETURNING slug
  `;
  return { slugs: rows.map((r) => r.slug) };
}

// Siehe setMissionOwner oben — gleiches Prinzip für Mission-Logs.
export async function setMissionLogOwner(
  logId: number,
  ownerId: number | null,
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE id = ${logId}
    RETURNING slug, mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

export async function setMissionLogVisibility(
  userId: number,
  logId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs ml
    SET visibility = ${visibility}, updated_at = NOW()
    FROM characters c
    WHERE ml.id = ${logId} AND c.id = ml.author_id AND c.player_id = ${userId}
    RETURNING ml.slug, ml.mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

export interface OwnMissionLogForEdit {
  id: number;
  title: string;
  logDate: string | null;
  sessionNr: number | null;
  sourceMarkdown: string;
  missionSlug: string;
  missionTitle: string;
  authorName: string;
  tags: string[];
}

// Für /users/[id]/mission-logs/[logId]/edit — lädt den rohen Markdown-Body
// (source_md) statt content (gerendertes HTML), damit das Formular ihn
// wieder editierbar vorbefüllen kann. Gleiche Owner-Prüfung wie
// setMissionLogVisibility (Spieler des Autor-Charakters).
export async function getOwnMissionLogForEdit(
  userId: number,
  logId: number,
): Promise<OwnMissionLogForEdit | null> {
  const rows = await sql<
    (Omit<OwnMissionLogForEdit, "tags"> & { tags: string[] | string })[]
  >`
    SELECT
      ml.id,
      ml.title,
      ml.log_date::text AS "logDate",
      ml.session_nr AS "sessionNr",
      COALESCE(ml.source_md, '') AS "sourceMarkdown",
      m.slug AS "missionSlug",
      m.title AS "missionTitle",
      c.name AS "authorName",
      COALESCE(ml.metadata->'tags', '[]'::jsonb) AS "tags"
    FROM mission_logs ml
    JOIN characters c ON c.id = ml.author_id
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.id = ${logId} AND c.player_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    tags: typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags,
  };
}

// Bearbeitet Titel/Datum/Text eines eigenen Logs. Slug-bildende Felder
// (author, mission, session_nr) bleiben unveränderlich, nur Inhalt/Titel/
// Datum sind editierbar. Schreibt direkt in die DB (siehe
// updateMissionLogAction) — die DB ist alleinige Source of Truth.
export async function updateMissionLogContent(
  userId: number,
  logId: number,
  input: {
    title: string;
    logDate: string | null;
    tags: string[];
    bodyMarkdown: string;
    // Siehe createMission oben — Opt-in "Automatisch verlinken".
    contentHtml?: string;
  },
): Promise<{ slug: string; missionId: number } | null> {
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<
    { slug: string; missionId: number }[]
  >`
    UPDATE mission_logs ml
    SET
      title      = ${input.title},
      log_date   = ${input.logDate},
      content    = ${contentHtml},
      source_md  = ${input.bodyMarkdown},
      metadata   = metadata || ${sql.json({ tags: input.tags } as ReturnType<typeof JSON.parse>)},
      updated_at = NOW()
    FROM characters c
    WHERE ml.id = ${logId} AND c.id = ml.author_id AND c.player_id = ${userId}
    RETURNING ml.slug, ml.mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

// Löscht ein eigenes Log aus der DB und räumt den zugehörigen
// timeline_events-Eintrag mit auf (der ist nur per source_type/source_slug,
// nicht per FK verknüpft — bliebe sonst als toter Link stehen, siehe
// src/lib/timeline.ts).
export async function deleteMissionLog(
  userId: number,
  logId: number,
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<
    {
      slug: string;
      missionId: number;
      title: string;
      visibility: string;
      ownerUserId: number | null;
    }[]
  >`
    DELETE FROM mission_logs ml
    USING characters c
    WHERE ml.id = ${logId}
      AND c.id = ml.author_id AND c.player_id = ${userId}
    RETURNING ml.slug, ml.mission_id AS "missionId",
              ml.title, ml.visibility, ml.owner_user_id AS "ownerUserId"
  `;
  const row = rows[0] ?? null;
  if (row) {
    await sql`
      DELETE FROM timeline_events
      WHERE source_type = 'mission_log' AND source_slug = ${row.slug}
    `;
    // Löschprotokoll fürs News-Feed (siehe getRecentDeletions in
    // recentActivity.ts) — der Log selbst ist jetzt weg, ohne dieses
    // Protokoll gäbe es keine Datenquelle mehr für einen "gelöscht"-Eintrag.
    await sql`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('mission_log', ${row.title}, ${row.visibility}, ${row.ownerUserId}, ${userId})
    `;
  }
  return row;
}

// Löscht eine Mission inkl. aller zugehörigen Mission-Logs (ON DELETE CASCADE,
// siehe scripts/schema.sql) und räumt deren timeline_events mit auf (nicht
// per FK verknüpft, gleiches Prinzip wie deleteMissionLog oben — Missionen
// selbst erzeugen keine eigenen timeline_events). Anders als deleteMissionLog
// kein Owner-Scoping: nur für admin/gm aufrufbar, siehe deleteMissionAction.
// deletedByUserId dient nur dem Löschprotokoll (content_deletions, siehe
// getRecentDeletions in recentActivity.ts) — hier immer die aufrufende
// admin/gm-Person, nicht owner_user_id der Mission selbst.
export async function deleteMission(
  missionId: number,
  deletedByUserId: number,
): Promise<{ slug: string; logSlugs: string[] } | null> {
  const logRows = await sql<{ slug: string }[]>`
    SELECT slug FROM mission_logs WHERE mission_id = ${missionId}
  `;

  const rows = await sql<
    { slug: string; title: string; ownerUserId: number | null }[]
  >`
    DELETE FROM missions WHERE id = ${missionId}
    RETURNING slug, title, owner_user_id AS "ownerUserId"
  `;
  const row = rows[0] ?? null;
  if (!row) return null;

  // Missionen haben keine visibility-Spalte (immer öffentlich) — visibility
  // bleibt NULL, getRecentDeletions behandelt das wie live Missionen.
  await sql`
    INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
    VALUES ('mission', ${row.title}, NULL, ${row.ownerUserId}, ${deletedByUserId})
  `;

  const logSlugs = logRows.map((l) => l.slug);
  if (logSlugs.length > 0) {
    await sql`
      DELETE FROM timeline_events
      WHERE source_type = 'mission_log' AND source_slug = ANY(${logSlugs})
    `;
  }

  return { slug: row.slug, logSlugs };
}

// Alle Mission-/Log-Pfade für die Sitemap und generateStaticParams. Nur
// public, damit private/gm-Logs nicht statisch vorgerendert oder
// gesitemappt werden (Laufzeit-Guard auf der Detailseite übernimmt sie).
export const getAllLogPaths = unstable_cache(
  async (): Promise<LogPath[]> => {
    const rows = await sql<LogPath[]>`
      SELECT
        m.slug  AS mission_slug,
        ml.slug AS log_slug,
        ml.updated_at::text AS updated_at
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id
      WHERE ml.visibility = 'public'
    `;
    return rows;
  },
  ["getAllLogPaths", "v2"],
  { tags: [cacheTags.missionLogs] },
);

// Für die Admin-Action "Autolinking" (src/app/actions/autolink.ts) — braucht
// id + rohen Markdown-Quelltext, unabhängig von Sichtbarkeit/Owner (Admins
// dürfen jedes Log autolinken, anders als updateMissionLogContent oben,
// das nur der eigene Verfasser nutzen darf).
export async function getMissionLogSourceBySlug(slug: string): Promise<{
  id: number;
  missionId: number;
  missionSlug: string;
  sourceMarkdown: string | null;
} | null> {
  const rows = await sql<
    {
      id: number;
      missionId: number;
      missionSlug: string;
      sourceMarkdown: string | null;
    }[]
  >`
    SELECT ml.id, ml.mission_id AS "missionId", m.slug AS "missionSlug",
           ml.source_md AS "sourceMarkdown"
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.slug = ${slug}
  `;
  return rows[0] ?? null;
}

export async function updateMissionLogSourceMd(
  logId: number,
  bodyMarkdown: string,
  contentHtml: string,
): Promise<void> {
  await sql`
    UPDATE mission_logs
    SET content = ${contentHtml}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${logId}
  `;
}

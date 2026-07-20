import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { renderContentHtml } from "@/lib/autolink";
// getMissionSubscribers lebt in dialoguesCore.ts, siehe Kommentar bei
// getCharacterSubscribers dort — gleiches Muster wie in characters.ts.
import { getMissionSubscribers } from "@/lib/dialogues";
import { sendMissionUpdatedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { logCaughtError } from "@/lib/errorLog";
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
// da log_count mitgezählt wird). Nur veröffentlichte Missionen (is_draft =
// false) — speist die öffentliche Übersicht, generateStaticParams und die
// Suche/Timeline/Statistik. Für die GM/Admin-Ansicht unter /user/content
// (die auch eigene Entwürfe zeigen soll) siehe getAllMissionsIncludingDrafts
// unten.
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
        ) AS authors,
        m.is_draft AS "isDraft"
      FROM missions m
      LEFT JOIN mission_logs ml ON ml.mission_id = m.id AND ml.deleted_at IS NULL
      LEFT JOIN characters c    ON c.id = ml.author_id
      WHERE m.deleted_at IS NULL AND m.is_draft = false
      GROUP BY m.id
      ORDER BY m.started_at DESC NULLS LAST, m.created_at DESC
    `;
    return rows.map(parseMeta);
  },
  ["getAllMissions", "v2"],
  { tags: [cacheTags.missions, cacheTags.missionLogs] },
);

// Wie getAllMissions, aber inklusive Entwürfe — für /user/content: anders
// als Charaktere/Missionslogs/Archiv-Einträge haben Missionen kein
// Einzel-Owner-Bearbeitungsmodell (jeder GM/Admin darf jede Mission
// bearbeiten, siehe missionAction), ein Mission-Entwurf ist deshalb für
// jeden GM/Admin sichtbar statt nur für den ursprünglichen Ersteller (siehe
// canViewDraft-Kommentar in missions/[missionSlug]/page.tsx für dieselbe
// Abweichung auf der Detailseite).
export const getAllMissionsIncludingDrafts = unstable_cache(
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
        ) AS authors,
        m.is_draft AS "isDraft"
      FROM missions m
      LEFT JOIN mission_logs ml ON ml.mission_id = m.id AND ml.deleted_at IS NULL
      LEFT JOIN characters c    ON c.id = ml.author_id
      WHERE m.deleted_at IS NULL
      GROUP BY m.id
      ORDER BY m.started_at DESC NULLS LAST, m.created_at DESC
    `;
    return rows.map(parseMeta);
  },
  ["getAllMissionsIncludingDrafts"],
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
          is_draft         AS "isDraft",
          source_md        AS "sourceMarkdown"
        FROM missions
        WHERE slug = ${slug} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (!rows[0]) return null;
      const mission = parseMeta(rows[0]);
      const participants = await getMissionParticipants(mission.id);
      return { ...mission, participants };
    },
    ["getMissionBySlug", "v6", slug],
    { tags: [cacheTags.missions, cacheTags.mission(slug)] },
  )();
}

// Eine Mission per numerischer ID — für den Admin/GM-Editier-Weg
// (/user/missions/[missionId]/edit), wo die ID aus der Route kommt
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
      is_draft         AS "isDraft",
      source_md        AS "sourceMarkdown"
    FROM missions
    WHERE id = ${id} AND deleted_at IS NULL
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
  isDraft: boolean;
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
      owner_user_id, is_draft, updated_at
    ) VALUES (
      ${input.slug},
      ${input.title},
      ${input.status},
      ${input.startedAt},
      ${input.endedAt},
      ${sql.json({ tags: input.tags, body: bodyHtml, teaser: input.teaser })},
      ${input.bodyMarkdown},
      ${input.ownerUserId},
      ${input.isDraft},
      NOW()
    )
    RETURNING id, slug
  `;
  return rows[0];
}

export interface UpdateMissionResult {
  slug: string;
  ownerSlug: string | null;
  wasDraft: boolean;
}

// Vollständige Bearbeitung einer Mission (Admin/GM-Formular unter
// /user/missions/[missionId]/edit). Der Slug bleibt unveränderlich
// (Identitätsfeld, siehe updateMissionLogContent oben für dasselbe Prinzip
// bei Logs) — er bildet sowohl den Vault-Ordnernamen als auch die
// mission_slug-Referenz bestehender Mission-Logs. wasDraft (Stand VOR
// diesem Update, per CTE) erlaubt dem Aufrufer, einen Entwurf→
// Veröffentlicht-Übergang von einer normalen Bearbeitung zu unterscheiden
// (siehe contentAction.ts).
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
    isDraft: boolean;
    // Siehe createMission oben — Opt-in "Automatisch verlinken".
    bodyHtml?: string;
  },
): Promise<UpdateMissionResult | null> {
  const bodyHtml = input.bodyHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<UpdateMissionResult[]>`
    WITH old AS (SELECT is_draft FROM missions WHERE id = ${missionId})
    UPDATE missions m
    SET
      title      = ${input.title},
      status     = ${input.status},
      started_at = ${input.startedAt},
      ended_at   = ${input.endedAt},
      metadata   = ${sql.json({ tags: input.tags, body: bodyHtml, teaser: input.teaser })},
      source_md  = ${input.bodyMarkdown},
      is_draft   = ${input.isDraft},
      updated_at = NOW()
    FROM old
    WHERE m.id = ${missionId}
    RETURNING
      m.slug,
      (SELECT slug FROM users WHERE id = m.owner_user_id) AS "ownerSlug",
      old.is_draft AS "wasDraft"
  `;
  return rows[0] ?? null;
}

// Benachrichtigt alle Abonnenten einer Mission (content_follows, target_type
// 'mission'), dass sich etwas an ihr geändert hat — analog
// notifyCharacterSubscribers in characters.ts. Gerufen von beiden
// Bearbeiten-Wegen (volles Formular: missions/_shared/contentAction.ts;
// Inline-Synopsis-Editor: app/actions/missions.ts#updateMissionSynopsisAction),
// jeweils NACH dem erfolgreichen Speichern. Best-effort wie dort: einzelne
// fehlgeschlagene Mails werden geloggt, brechen den Rest nicht ab.
// editingUserId schließt den Bearbeitenden selbst aus. Anders als bei
// Charakteren ist die Zusammenfassung bei Missionen ein Pflichtfeld, preview
// kommt deshalb direkt vom Aufrufer statt hier aus rohem Markdown abgeleitet
// zu werden (der hat preview für notifyContentChange ohnehin schon parat).
export async function notifyMissionSubscribers(input: {
  missionSlug: string;
  missionTitle: string;
  editingUserId: number;
  preview: string;
}): Promise<void> {
  const subscribers = await getMissionSubscribers(
    input.missionSlug,
    input.editingUserId,
  );
  if (subscribers.length === 0) return;

  const missionUrl = `${await getBaseUrl()}/missions/${input.missionSlug}`;
  // Parallel statt sequenziell: die Aktion, die diese Funktion aufruft
  // (Inline-Synopsis-Editor wie voller Formular-Speichern), wartet auf das
  // Ergebnis, bevor sie ihren Erfolg zurückmeldet — bei vielen Abonnenten
  // würde eine sequenzielle Schleife die Antwortzeit linear mit der
  // Abonnentenzahl wachsen lassen (gleiches Prinzip wie notifyContentChange
  // in follows.ts).
  await Promise.allSettled(
    subscribers.map(async (subscriber) => {
      if (subscriber.emailNotificationsEnabled) {
        const result = await sendMissionUpdatedEmail({
          to: subscriber.email,
          name: subscriber.name,
          missionTitle: input.missionTitle,
          missionUrl,
          preview: input.preview,
        });
        if (!result.sent) {
          const message = `Mission-Update-Mail an ${subscriber.email} fehlgeschlagen: ${result.error}`;
          console.error(message);
          void logCaughtError(new Error(message), "missions.ts:notifyMissionSubscribers");
        }
      }
      if (subscriber.pushNotificationsEnabled) {
        await sendPushToUser(subscriber.id, {
          title: `Aktualisiert: ${input.missionTitle}`,
          body: input.preview,
          url: missionUrl,
        });
      }
    }),
  );
}

export interface UpdateMissionSynopsisResult {
  slug: string;
  title: string;
  metadata: MissionMetaData;
}

// Nur-Synopsis-Bearbeitung (inline auf /missions/[slug], MissionSynopsisEditor)
// — Titel/Status/Zeitraum/Tags bleiben unangetastet, deshalb reicht slug +
// die aktualisierte metadata als Rückgabe. title zusätzlich (nicht nur slug)
// für notifyMissionSubscribers im Aufrufer (actions/missions.ts), der sonst
// eine zweite Query bräuchte.
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
    RETURNING m.slug, m.title, m.metadata
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
    SELECT MAX(log_date)::text AS log_date FROM mission_logs WHERE deleted_at IS NULL
  `;
  return row?.log_date ?? null;
}

// Vorschlagswert fürs Session-Nr-Feld im "Neuer Missionslog"-Formular
// (src/app/user/mission-logs/new) — nur ein Default, das Feld bleibt
// editierbar. Kein Cache: soll bei jedem Seitenaufruf den aktuellen Stand
// zeigen, nicht bis zur nächsten Tag-Invalidierung stale bleiben.
export async function getNextSessionNr(
  missionId: number,
  authorId: number,
): Promise<number> {
  const [row] = await sql<{ next: number }[]>`
    SELECT COALESCE(MAX(session_nr), 0) + 1 AS next
    FROM mission_logs
    WHERE mission_id = ${missionId} AND author_id = ${authorId} AND deleted_at IS NULL
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
  isDraft: boolean;
  // Siehe createMission oben — Opt-in "Automatisch verlinken".
  contentHtml?: string;
}): Promise<{ id: number; slug: string }> {
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<{ id: number; slug: string }[]>`
    INSERT INTO mission_logs (
      slug, mission_id, author_id, title, content, log_date, session_nr,
      metadata, source_md, owner_user_id, is_draft, updated_at
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
      ${input.isDraft},
      NOW()
    )
    RETURNING id, slug
  `;
  return rows[0];
}

// Kollisionsprüfung vor dem Anlegen eines neuen Mission-Logs
// (src/app/user/mission-logs/new/actions.ts) — der Slug ist
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
        WHERE ml.mission_id = ${missionId} AND ml.visibility = 'public' AND ml.deleted_at IS NULL
          AND ml.is_draft = false
        ORDER BY ml.session_nr DESC NULLS LAST, ml.created_at DESC
      `;
      return rows;
    },
    ["getLogsByMissionId", "v4", String(missionId)],
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
          ml.owner_user_id AS "ownerUserId",
          ml.is_draft AS "isDraft"
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.slug = ${slug} AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
        LIMIT 1
      `;
      return rows[0] ?? null;
    },
    ["getLogBySlug", "v4", slug],
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
        WHERE c.slug = ${authorSlug} AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
          AND ml.is_draft = false
        ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST, ml.id ASC
      `;

      const i = logs.findIndex((l) => l.slug === currentSlug);
      if (i === -1) return { prev: null, next: null };
      return {
        prev: logs[i - 1] ?? null,
        next: logs[i + 1] ?? null,
      };
    },
    ["getAuthorLogNav", "v2", authorSlug, currentSlug],
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
// src/app/admin/missionOwnerActions.ts) — spart das mühsame Einzeln-Zuordnen
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
): Promise<{
  slug: string;
  missionId: number;
  missionSlug: string;
  title: string;
  sourceMarkdown: string | null;
} | null> {
  const rows = await sql<
    {
      slug: string;
      missionId: number;
      missionSlug: string;
      title: string;
      sourceMarkdown: string | null;
    }[]
  >`
    UPDATE mission_logs ml
    SET visibility = ${visibility}, updated_at = NOW()
    FROM characters c, missions m
    WHERE ml.id = ${logId} AND c.id = ml.author_id AND c.player_id = ${userId}
      AND m.id = ml.mission_id
    RETURNING ml.slug, ml.mission_id AS "missionId", m.slug AS "missionSlug",
              ml.title, ml.source_md AS "sourceMarkdown"
  `;
  return rows[0] ?? null;
}

// Admin-Sichtbarkeits-Verwaltung (ActionsMenu.tsx/AdminVisibilitySelect.tsx):
// anders als setMissionLogVisibility oben NICHT auf den Autor-Charakter des
// aufrufenden Users gescoped (nur admin darf das, geprüft in
// setVisibilityAdminAction) — mirrort setMissionLogOwner oben.
export async function setMissionLogVisibilityAdmin(
  logId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${logId}
    RETURNING slug, mission_id AS "missionId"
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
  isDraft: boolean;
}

// Für /user/mission-logs/[logId]/edit — lädt den rohen Markdown-Body
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
      COALESCE(ml.metadata->'tags', '[]'::jsonb) AS "tags",
      ml.is_draft AS "isDraft"
    FROM mission_logs ml
    JOIN characters c ON c.id = ml.author_id
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.id = ${logId} AND c.player_id = ${userId} AND ml.deleted_at IS NULL
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
// updateMissionLogAction) — die DB ist alleinige Source of Truth. wasDraft
// (Stand VOR diesem Update, per CTE) + authorSlug/authorName erlauben dem
// Aufrufer, bei einem Entwurf→Veröffentlicht-Übergang dieselbe
// Autor-Abonnenten-Benachrichtigung wie beim erstmaligen Anlegen
// auszulösen (siehe contentAction.ts).
export async function updateMissionLogContent(
  userId: number,
  logId: number,
  input: {
    title: string;
    logDate: string | null;
    tags: string[];
    bodyMarkdown: string;
    isDraft: boolean;
    // Siehe createMission oben — Opt-in "Automatisch verlinken".
    contentHtml?: string;
  },
): Promise<{
  slug: string;
  missionId: number;
  missionSlug: string;
  visibility: "private" | "gm" | "public";
  wasDraft: boolean;
  authorSlug: string;
  authorName: string;
} | null> {
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));

  const rows = await sql<
    {
      slug: string;
      missionId: number;
      missionSlug: string;
      visibility: "private" | "gm" | "public";
      wasDraft: boolean;
      authorSlug: string;
      authorName: string;
    }[]
  >`
    WITH old AS (SELECT is_draft FROM mission_logs WHERE id = ${logId})
    UPDATE mission_logs ml
    SET
      title      = ${input.title},
      log_date   = ${input.logDate},
      content    = ${contentHtml},
      source_md  = ${input.bodyMarkdown},
      metadata   = metadata || ${sql.json({ tags: input.tags } as ReturnType<typeof JSON.parse>)},
      is_draft   = ${input.isDraft},
      updated_at = NOW()
    FROM characters c, missions m, old
    WHERE ml.id = ${logId} AND c.id = ml.author_id AND c.player_id = ${userId}
      AND m.id = ml.mission_id
    RETURNING ml.slug, ml.mission_id AS "missionId", m.slug AS "missionSlug",
              ml.visibility, old.is_draft AS "wasDraft",
              c.slug AS "authorSlug", c.name AS "authorName"
  `;
  return rows[0] ?? null;
}

// Löscht ein eigenes Log weich (deleted_at gesetzt statt DELETE) — bleibt in
// der DB, verschwindet aber aus allen Listen/der Suche/der Timeline für
// alle außer Admins (siehe getAllContentForAdmin/Trash-Ansicht in
// lib/adminContent.ts) und wird nach 7 Tagen vom Purge-Cronjob endgültig
// entfernt (dort auch die Bereinigung von timeline_events/content_follows,
// die hier bewusst NICHT sofort passiert — ein wiederhergestelltes Log
// soll seine Timeline-Einträge/Abos zurückbekommen, siehe restoreMissionLog).
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
      isDraft: boolean;
    }[]
  >`
    UPDATE mission_logs ml
    SET deleted_at = NOW()
    FROM characters c
    WHERE ml.id = ${logId}
      AND c.id = ml.author_id AND c.player_id = ${userId}
      AND ml.deleted_at IS NULL
    RETURNING ml.slug, ml.mission_id AS "missionId",
              ml.title, ml.visibility, ml.owner_user_id AS "ownerUserId",
              ml.is_draft AS "isDraft"
  `;
  const row = rows[0] ?? null;
  // Löschprotokoll fürs News-Feed (siehe getRecentDeletions in
  // recentActivity.ts) — aus Sicht aller Nicht-Admins ist der Log jetzt weg,
  // ohne dieses Protokoll gäbe es keine Datenquelle mehr für einen
  // "gelöscht"-Eintrag. Ausgenommen Entwürfe: die waren für niemanden außer
  // dem Owner sichtbar, ihr Löschen darf also nicht im News-Feed auftauchen.
  if (row && !row.isDraft) {
    await sql`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('mission_log', ${row.title}, ${row.visibility}, ${row.ownerUserId}, ${userId})
    `;
  }
  return row;
}

// Macht ein weich gelöschtes Log wieder sichtbar (Admin-Trash-Ansicht) —
// timeline_events/content_follows wurden beim Löschen nie entfernt, tauchen
// also automatisch wieder auf (Timeline erst nach der nächsten manuellen
// Regenerierung, siehe regenerateTimeline in timeline.ts).
export async function restoreMissionLog(
  logId: number,
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<{ slug: string; missionId: number }[]>`
    UPDATE mission_logs SET deleted_at = NULL
    WHERE id = ${logId} AND deleted_at IS NOT NULL
    RETURNING slug, mission_id AS "missionId"
  `;
  return rows[0] ?? null;
}

// Wie deleteMissionLog oben, aber ohne Owner-Scoping (author.player_id) —
// für den Admin-Löschknopf in ActionsMenu.tsx/der Trash-Ansicht, wo bereits
// requireAdmin() im Aufrufer die Berechtigung prüft. deletedByUserId kann
// null sein (siehe content_deletions.deleted_by ON DELETE SET NULL) — die
// Trash-Ansicht selbst zeigt aber immer die aufrufende Admin-Person an.
export async function deleteMissionLogAsAdmin(
  logId: number,
  deletedByUserId: number,
): Promise<{ slug: string; missionId: number } | null> {
  const rows = await sql<
    {
      slug: string;
      missionId: number;
      title: string;
      visibility: string;
      ownerUserId: number | null;
      isDraft: boolean;
    }[]
  >`
    UPDATE mission_logs
    SET deleted_at = NOW()
    WHERE id = ${logId} AND deleted_at IS NULL
    RETURNING slug, mission_id AS "missionId",
              title, visibility, owner_user_id AS "ownerUserId", is_draft AS "isDraft"
  `;
  const row = rows[0] ?? null;
  if (row && !row.isDraft) {
    await sql`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('mission_log', ${row.title}, ${row.visibility}, ${row.ownerUserId}, ${deletedByUserId})
    `;
  }
  return row;
}

// Löscht eine Mission weich, inkl. aller ihrer (noch nicht individuell
// gelöschten) Mission-Logs — dieselbe Soft-Delete-Semantik wie
// deleteMissionLog oben, kein hartes DELETE/CASCADE mehr. Kein eigener
// content_deletions-Eintrag pro mitgelöschtem Log: das Löschen der Mission
// selbst ist das relevante Ereignis fürs News-Feed. Anders als
// deleteMissionLog kein Owner-Scoping: nur für admin/gm aufrufbar, siehe
// deleteMissionAction. deletedByUserId dient nur dem Löschprotokoll
// (content_deletions, siehe getRecentDeletions in recentActivity.ts) — hier
// immer die aufrufende admin/gm-Person, nicht owner_user_id der Mission
// selbst.
export async function deleteMission(
  missionId: number,
  deletedByUserId: number,
): Promise<{ slug: string; logSlugs: string[] } | null> {
  return sql.begin(async (tx) => {
    const logRows = await tx<{ slug: string }[]>`
      SELECT slug FROM mission_logs WHERE mission_id = ${missionId} AND deleted_at IS NULL
    `;

    const rows = await tx<
      { slug: string; title: string; ownerUserId: number | null; isDraft: boolean }[]
    >`
      UPDATE missions SET deleted_at = NOW()
      WHERE id = ${missionId} AND deleted_at IS NULL
      RETURNING slug, title, owner_user_id AS "ownerUserId", is_draft AS "isDraft"
    `;
    const row = rows[0] ?? null;
    if (!row) return null;

    // Missionen haben keine visibility-Spalte (immer öffentlich) — visibility
    // bleibt NULL, getRecentDeletions behandelt das wie live Missionen.
    // Entwürfe ausgenommen (waren für niemanden außer GM/Admin sichtbar).
    if (!row.isDraft) {
      await tx`
        INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
        VALUES ('mission', ${row.title}, NULL, ${row.ownerUserId}, ${deletedByUserId})
      `;
    }

    const logSlugs = logRows.map((l) => l.slug);
    if (logSlugs.length > 0) {
      await tx`
        UPDATE mission_logs SET deleted_at = NOW()
        WHERE mission_id = ${missionId} AND deleted_at IS NULL
      `;
    }

    return { slug: row.slug, logSlugs };
  });
}

// Macht eine weich gelöschte Mission inkl. der zusammen mit ihr gelöschten
// Logs wieder sichtbar (Admin-Trash-Ansicht) — restauriert bewusst ALLE
// aktuell gelöschten Logs der Mission, nicht nur die beim Mission-Löschen
// mitgelöschten (ein Log, das schon vorher einzeln gelöscht wurde, kommt
// dadurch ebenfalls zurück; seltener Edge-Case, aber einfacher als eine
// eigene "durch Kaskade gelöscht"-Markierung zu pflegen).
export async function restoreMission(
  missionId: number,
): Promise<{ slug: string } | null> {
  return sql.begin(async (tx) => {
    const rows = await tx<{ slug: string }[]>`
      UPDATE missions SET deleted_at = NULL
      WHERE id = ${missionId} AND deleted_at IS NOT NULL
      RETURNING slug
    `;
    const row = rows[0] ?? null;
    if (!row) return null;

    await tx`
      UPDATE mission_logs SET deleted_at = NULL WHERE mission_id = ${missionId}
    `;
    return row;
  });
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
      WHERE ml.visibility = 'public' AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
        AND ml.is_draft = false
    `;
    return rows;
  },
  ["getAllLogPaths", "v4"],
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

import "server-only";
import sql from "@/lib/db";
import type { TrashContentType } from "@/lib/adminContent";

// Endgültiges Löschen bereits weich gelöschter Inhalte (deleted_at gesetzt,
// siehe deleteCharacter/deleteMission/deleteMissionLogAsAdmin/
// deleteArchiveEntry/deleteDialogue) — zwei Aufrufer:
// - purgeExpiredSoftDeletedContent(): täglicher Cronjob
//   (scripts/purge-soft-deleted.ts), löscht alles, dessen deleted_at älter
//   als retentionDays ist.
// - purgeContentById(): "Endgültig löschen"-Knopf in der Admin-Trash-Ansicht
//   (/admin/content/trash), löscht einen einzelnen, bereits weich
//   gelöschten Eintrag sofort, unabhängig vom Alter.
// Beide räumen zusätzlich timeline_events/content_follows auf (nicht per FK
// verknüpft, siehe die ursprünglichen deleteMission/deleteDialogue-
// Kommentare vor der Soft-Delete-Umstellung) — das war bisher Teil des
// Lösch-Vorgangs selbst, passiert jetzt erst hier, beim endgültigen Purge.

async function purgeArchiveLinksAndFollows(slug: string): Promise<void> {
  await sql`
    DELETE FROM timeline_events
    WHERE source_type = 'archive_entry' AND source_slug = ${slug}
  `;
  await sql`
    DELETE FROM content_follows
    WHERE target_type = 'archive_entry' AND target_slug = ${slug}
  `;
}

export async function purgeExpiredSoftDeletedContent(
  retentionDays = 7,
): Promise<{
  characters: number;
  missions: number;
  missionLogs: number;
  archiveEntries: number;
}> {
  const cutoff = sql`NOW() - (${retentionDays} * INTERVAL '1 day')`;

  const characterRows = await sql<{ slug: string }[]>`
    DELETE FROM characters WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}
    RETURNING slug
  `;

  const missionRows = await sql<{ id: number; slug: string }[]>`
    DELETE FROM missions WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}
    RETURNING id, slug
  `;
  for (const m of missionRows) {
    await sql`
      DELETE FROM timeline_events WHERE source_type = 'mission' AND source_slug = ${m.slug}
    `;
    await sql`
      DELETE FROM content_follows WHERE target_type = 'mission' AND target_slug = ${m.slug}
    `;
    // Zugehörige, noch nicht individuell gelöschte Logs sind durch das
    // Mission-Löschen ebenfalls deleted_at gesetzt (siehe deleteMission in
    // lib/missions.ts) — werden gleich unten mit demselben Cutoff mitgepurgt.
  }

  const logRows = await sql<{ slug: string }[]>`
    DELETE FROM mission_logs WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}
    RETURNING slug
  `;
  for (const log of logRows) {
    await sql`
      DELETE FROM timeline_events WHERE source_type = 'mission_log' AND source_slug = ${log.slug}
    `;
  }

  const archiveRows = await sql<{ slug: string }[]>`
    DELETE FROM archive_entries WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff}
    RETURNING slug
  `;
  for (const entry of archiveRows) {
    await purgeArchiveLinksAndFollows(entry.slug);
  }

  return {
    characters: characterRows.length,
    missions: missionRows.length,
    missionLogs: logRows.length,
    archiveEntries: archiveRows.length,
  };
}

export async function purgeContentById(
  contentType: TrashContentType,
  id: number,
): Promise<boolean> {
  if (contentType === "character") {
    const rows = await sql<{ id: number }[]>`
      DELETE FROM characters WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING id
    `;
    return rows.length > 0;
  }
  if (contentType === "mission") {
    const rows = await sql<{ slug: string }[]>`
      DELETE FROM missions WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING slug
    `;
    const row = rows[0];
    if (!row) return false;
    await sql`DELETE FROM timeline_events WHERE source_type = 'mission' AND source_slug = ${row.slug}`;
    await sql`DELETE FROM content_follows WHERE target_type = 'mission' AND target_slug = ${row.slug}`;
    await sql`DELETE FROM mission_logs WHERE mission_id = ${id} AND deleted_at IS NOT NULL`;
    return true;
  }
  if (contentType === "mission_log") {
    const rows = await sql<{ slug: string }[]>`
      DELETE FROM mission_logs WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING slug
    `;
    const row = rows[0];
    if (!row) return false;
    await sql`DELETE FROM timeline_events WHERE source_type = 'mission_log' AND source_slug = ${row.slug}`;
    return true;
  }
  // archive_entry und dialogue teilen sich dieselbe Tabelle.
  const rows = await sql<{ slug: string }[]>`
    DELETE FROM archive_entries WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING slug
  `;
  const row = rows[0];
  if (!row) return false;
  await purgeArchiveLinksAndFollows(row.slug);
  return true;
}

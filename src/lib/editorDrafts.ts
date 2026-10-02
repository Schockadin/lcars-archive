import "server-only";
import sql from "@/lib/db";
import { getCurrentUser, getRoleMap } from "@/lib/dal";
import { userCan } from "@/lib/permissions";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import type { EditorDraftFields, EditorDraftType } from "@/lib/editorDraftTypes";
import type { User } from "@/types/db";

const EDITOR_DRAFT_TTL_DAYS = 30;

async function canEditContent(
  user: User,
  contentType: EditorDraftType,
  contentId: number,
): Promise<boolean> {
  // Neue Inhalte haben noch keine Datenbank-ID. Ihr negativer, zufälliger
  // Entwurfsbezeichner ist nur im persönlichen editor_drafts-Namespace
  // sichtbar; die normale Speichern-Action prüft später die konkrete Anlage.
  if (contentId < 0) {
    if (contentType === "dialogue") return true;
    if (
      contentType === "game_session" ||
      contentType === "planned_session"
    ) {
      return userCan(user, "gm.access", await getRoleMap());
    }
    if (contentType === "mission") {
      return userCan(user, "missions.manage", await getRoleMap());
    }
    if (
      contentType === "archive" ||
      contentType === "mission_log" ||
      contentType === "manual_event"
    ) {
      return userCan(user, "content.create", await getRoleMap());
    }
    return false;
  }

  // Gespräche werden über eigene Aktionen angelegt und haben keinen
  // gemeinsamen Inhaltseditor für bestehende Datensätze.
  if (
    contentType === "dialogue" ||
    contentType === "game_session" ||
    contentType === "planned_session"
  ) {
    return false;
  }

  if (contentType === "archive") {
    const asModerator = viewerHasPermission(
      await getViewer(),
      "content.moderate",
    );
    const rows = await sql<{ id: number }[]>`
      SELECT id FROM archive_entries
      WHERE id = ${contentId} AND category != 'dialogue'
        AND deleted_at IS NULL
        AND (owner_user_id = ${user.id} OR ${asModerator})
      LIMIT 1
    `;
    return rows.length > 0;
  }

  if (contentType === "mission") {
    if (!userCan(user, "missions.manage", await getRoleMap())) {
      return false;
    }
    const rows = await sql<{ id: number }[]>`
      SELECT id FROM missions
      WHERE id = ${contentId} AND deleted_at IS NULL
      LIMIT 1
    `;
    return rows.length > 0;
  }

  if (contentType === "manual_event") {
    const canModerate = viewerHasPermission(
      await getViewer(),
      "content.moderate",
    );
    const rows = await sql<{ id: number }[]>`
      SELECT id FROM timeline_events
      WHERE id = ${contentId} AND origin = 'manual'
        AND (created_by = ${user.id} OR ${canModerate})
      LIMIT 1
    `;
    return rows.length > 0;
  }

  if (contentType === "character_document") {
    const rows = await sql<{ id: number }[]>`
      SELECT d.id
      FROM character_documents d
      JOIN characters c ON c.id = d.character_id
      WHERE d.id = ${contentId} AND c.player_id = ${user.id}
        AND c.deleted_at IS NULL
      LIMIT 1
    `;
    return rows.length > 0;
  }

  const rows = await sql<{ id: number }[]>`
    SELECT ml.id
    FROM mission_logs ml
    JOIN characters c ON c.id = ml.author_id
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.id = ${contentId} AND c.player_id = ${user.id}
      AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function readEditorDraft(
  userId: number,
  contentType: EditorDraftType,
  contentId: number,
): Promise<{ fields: EditorDraftFields; revision: number } | null> {
  await sql`
    DELETE FROM editor_drafts
    WHERE user_id = ${userId} AND content_type = ${contentType}
      AND content_id = ${contentId} AND expires_at <= NOW()
  `;
  const rows = await sql<
    { fields: EditorDraftFields | string; revision: number }[]
  >`
    SELECT fields, revision
    FROM editor_drafts
    WHERE user_id = ${userId} AND content_type = ${contentType}
      AND content_id = ${contentId} AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    fields: typeof row.fields === "string" ? JSON.parse(row.fields) : row.fields,
    revision: row.revision,
  };
}

export async function saveEditorDraft(
  userId: number,
  contentType: EditorDraftType,
  contentId: number,
  expectedRevision: number | null,
  fields: EditorDraftFields,
): Promise<{ revision: number } | null> {
  const rows =
    expectedRevision === null
      ? await sql<{ revision: number }[]>`
          INSERT INTO editor_drafts (
            user_id, content_type, content_id, fields, revision, expires_at
          ) VALUES (
            ${userId}, ${contentType}, ${contentId},
            ${sql.json(fields as ReturnType<typeof JSON.parse>)}, 1,
            NOW() + (${EDITOR_DRAFT_TTL_DAYS} * INTERVAL '1 day')
          )
          ON CONFLICT (user_id, content_type, content_id)
          DO UPDATE SET
            fields = EXCLUDED.fields,
            revision = editor_drafts.revision + 1,
            updated_at = NOW(),
            expires_at = EXCLUDED.expires_at
          WHERE editor_drafts.expires_at <= NOW()
          RETURNING revision
        `
      : await sql<{ revision: number }[]>`
          UPDATE editor_drafts
          SET fields = ${sql.json(fields as ReturnType<typeof JSON.parse>)},
              revision = revision + 1,
              updated_at = NOW(),
              expires_at = NOW() + (${EDITOR_DRAFT_TTL_DAYS} * INTERVAL '1 day')
          WHERE user_id = ${userId}
            AND content_type = ${contentType}
            AND content_id = ${contentId}
            AND expires_at > NOW()
            AND revision = ${expectedRevision}
          RETURNING revision
        `;
  return rows[0] ?? null;
}

export async function removeEditorDraft(
  userId: number,
  contentType: EditorDraftType,
  contentId: number,
): Promise<void> {
  await sql`
    DELETE FROM editor_drafts
    WHERE user_id = ${userId} AND content_type = ${contentType}
      AND content_id = ${contentId}
  `;
}

export async function requireEditorDraftAccess(
  contentType: EditorDraftType,
  contentId: number,
): Promise<number | null> {
  const user = await getCurrentUser();
  if (
    !Number.isSafeInteger(contentId) ||
    contentId === 0 ||
    contentId < -2_147_483_647 ||
    contentId > 2_147_483_647
  ) {
    return null;
  }
  if (!(await canEditContent(user, contentType, contentId))) return null;
  return user.id;
}

// Form-Actions rufen das nur nach erfolgreichem Anlegen auf. Es entfernt
// ausschließlich den negativen, temporären Entwurf der aktuellen Person;
// reguläre Entwürfe bestehender Inhalte haben positive IDs.
export async function removeNewEditorDraftFromForm(
  userId: number,
  contentType: EditorDraftType,
  formData: FormData,
): Promise<void> {
  const id = Number(formData.get("editorDraftId"));
  if (
    !Number.isSafeInteger(id) ||
    id >= 0 ||
    id < -2_147_483_647
  ) {
    return;
  }
  await removeEditorDraft(userId, contentType, id);
}

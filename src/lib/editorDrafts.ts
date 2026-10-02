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
  const rows = await sql<{ revision: number }[]>`
    INSERT INTO editor_drafts (
      user_id, content_type, content_id, fields, revision, expires_at
    ) SELECT
      ${userId}, ${contentType}, ${contentId},
      ${sql.json(fields as ReturnType<typeof JSON.parse>)}, 1,
      NOW() + (${EDITOR_DRAFT_TTL_DAYS} * INTERVAL '1 day')
    WHERE ${expectedRevision}::INT IS NULL
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      fields = EXCLUDED.fields,
      revision = editor_drafts.revision + 1,
      updated_at = NOW(),
      expires_at = EXCLUDED.expires_at
    WHERE (
      editor_drafts.expires_at <= NOW()
      AND ${expectedRevision}::INT IS NULL
    ) OR (
      editor_drafts.expires_at > NOW()
      AND editor_drafts.revision = ${expectedRevision}
    )
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
  if (!Number.isSafeInteger(contentId) || contentId <= 0) return null;
  if (!(await canEditContent(user, contentType, contentId))) return null;
  return user.id;
}

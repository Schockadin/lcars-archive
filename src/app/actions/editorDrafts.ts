"use server";

import {
  readEditorDraft as readDraft,
  requireEditorDraftAccess,
  saveEditorDraft as writeDraft,
} from "@/lib/editorDrafts";
import {
  isEditorDraftType,
  validateEditorDraftFields,
  type EditorDraftType,
} from "@/lib/editorDraftTypes";

export async function loadEditorDraft(
  type: unknown,
  contentId: number,
): Promise<{ fields: Record<string, string | boolean | string[]>; revision: number } | null> {
  if (!isEditorDraftType(type)) return null;
  const userId = await requireEditorDraftAccess(type, contentId);
  if (userId == null) return null;
  return readDraft(userId, type, contentId);
}

export async function saveEditorDraft(
  type: unknown,
  contentId: number,
  expectedRevision: number | null,
  rawFields: unknown,
): Promise<{ ok: true; revision: number } | { ok: false }> {
  if (
    !isEditorDraftType(type) ||
    !Number.isSafeInteger(contentId) ||
    contentId === 0 ||
    contentId < -2_147_483_647 ||
    contentId > 2_147_483_647 ||
    (expectedRevision !== null &&
      (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1))
  ) {
    return { ok: false };
  }

  const userId = await requireEditorDraftAccess(type, contentId);
  const fields = validateEditorDraftFields(rawFields);
  if (userId == null || !fields) return { ok: false };

  const result = await writeDraft(
    userId,
    type as EditorDraftType,
    contentId,
    expectedRevision,
    fields,
  );
  return result ? { ok: true, revision: result.revision } : { ok: false };
}

import { createHash } from "node:crypto";
import sql from "@/lib/db";
import { editorJson, getStaEditorContext, isEditorUuid, isRecord, readEditorJson } from "@/lib/staCharEditorApi";
import { sanitizeStaEditorCharacter } from "@/lib/staCharEditorValidation";

export const runtime = "nodejs";
const PAGE_SIZE = 100;
const NO_STORE = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" };

interface EditorRow {
  character_id: string;
  owner_user_id: number;
  visibility: "private" | "campaign";
  revision: number | string;
  data: unknown;
  module_versions: Record<string, string>;
  deleted: boolean;
  updated_at: Date | string;
}

interface ChangeRow extends EditorRow {
  id: number | string;
}

interface Mutation {
  opId: string;
  characterId: string;
  baseRevision: number | null;
  visibility: "private" | "campaign";
  data: NonNullable<ReturnType<typeof sanitizeStaEditorCharacter>>;
  moduleVersions: Record<string, string>;
  deleted: boolean;
  localRevision: number;
}

function toCharacter(row: EditorRow) {
  return {
    id: row.character_id,
    ownerUserId: row.owner_user_id,
    visibility: row.visibility,
    revision: Number(row.revision),
    data: row.data,
    moduleVersions: row.module_versions || {},
    deleted: row.deleted,
    updatedAt: row.updated_at,
  };
}

function parseMutation(value: unknown): Mutation | null {
  if (!isRecord(value) || !isEditorUuid(value.opId) || !isEditorUuid(value.characterId)) return null;
  if (value.baseRevision !== null && (!Number.isSafeInteger(value.baseRevision) || Number(value.baseRevision) < 1)) return null;
  if (value.visibility !== "private" && value.visibility !== "campaign") return null;
  if (typeof value.deleted !== "boolean") return null;
  const data = sanitizeStaEditorCharacter(value.data);
  if (!data) return null;
  const moduleVersions: Record<string, string> = {};
  if (value.moduleVersions !== undefined && !isRecord(value.moduleVersions)) return null;
  for (const [id, version] of Object.entries(value.moduleVersions || {}).slice(0, 50)) {
    if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(id) || typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) return null;
    moduleVersions[id] = version;
  }
  return {
    opId: value.opId,
    characterId: value.characterId,
    baseRevision: value.baseRevision as number | null,
    visibility: value.visibility,
    data,
    moduleVersions,
    deleted: value.deleted,
    localRevision: Number.isSafeInteger(value.localRevision) && Number(value.localRevision) > 0 ? Number(value.localRevision) : 1,
  };
}

function jsonHash(value: Mutation): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function saveMutation(
  mutation: Mutation,
  userId: number,
  canShareCampaign: boolean,
  canManageCharacters: boolean,
) {
  const hash = jsonHash(mutation);
  return sql.begin(async (tx) => {
    await tx`
      INSERT INTO sta_editor_sync_ops (op_id, user_id, request_hash, response)
      VALUES (${mutation.opId}::uuid, ${userId}, ${hash}, NULL)
      ON CONFLICT (op_id) DO NOTHING
    `;
    const [operation] = await tx`
      SELECT user_id, request_hash, response
      FROM sta_editor_sync_ops WHERE op_id = ${mutation.opId}::uuid FOR UPDATE
    `;
    if (!operation || operation.user_id !== userId) {
      return { opId: mutation.opId, status: "forbidden", error: "Dieser Vorgang gehört zu einem anderen LCARS-Konto." };
    }
    if (operation.request_hash !== hash) {
      return { opId: mutation.opId, status: "error", error: "Die Vorgangs-ID wurde bereits mit anderen Daten verwendet." };
    }
    if (operation.response) return operation.response;

    const [existing] = await tx<EditorRow[]>`
      SELECT character_id, owner_user_id, visibility, revision, data, module_versions,
             deleted, updated_at
      FROM sta_editor_characters WHERE character_id = ${mutation.characterId}::uuid FOR UPDATE
    `;
    let result: Record<string, unknown>;
    if (existing) {
      const isOwner = existing.owner_user_id === userId;
      const isManager = canManageCharacters;
      if (!isOwner && !(existing.visibility === "campaign" && isManager)) {
        result = { opId: mutation.opId, status: "forbidden", error: "Dieser Charakter ist für dein Konto schreibgeschützt." };
      } else if (mutation.visibility === "campaign" && !canShareCampaign) {
        result = { opId: mutation.opId, status: "forbidden", error: "Dein Konto darf keine Kampagnencharaktere teilen." };
      } else if (mutation.baseRevision !== Number(existing.revision)) {
        result = { opId: mutation.opId, status: "conflict", remote: toCharacter(existing) };
      } else {
        const [saved] = await tx<EditorRow[]>`
          UPDATE sta_editor_characters
          SET visibility = ${mutation.visibility}, data = ${tx.json(mutation.data as ReturnType<typeof JSON.parse>)},
              module_versions = ${tx.json(mutation.moduleVersions as ReturnType<typeof JSON.parse>)},
              deleted = ${mutation.deleted}, revision = revision + 1, updated_at = NOW()
          WHERE character_id = ${mutation.characterId}::uuid
          RETURNING character_id, owner_user_id, visibility, revision, data, module_versions,
                    deleted, updated_at
        `;
        await tx`
          INSERT INTO sta_editor_changes
            (character_id, owner_user_id, visibility, revision, data, module_versions, deleted)
          VALUES (${saved.character_id}::uuid, ${saved.owner_user_id}, ${saved.visibility}, ${saved.revision},
                  ${tx.json(saved.data as ReturnType<typeof JSON.parse>)}, ${tx.json(saved.module_versions as ReturnType<typeof JSON.parse>)}, ${saved.deleted})
        `;
        result = { opId: mutation.opId, status: "ok", character: toCharacter(saved) };
      }
    } else if (mutation.baseRevision !== null) {
      result = { opId: mutation.opId, status: "conflict", remote: null };
    } else if (mutation.visibility === "campaign" && !canShareCampaign) {
      result = { opId: mutation.opId, status: "forbidden", error: "Dein Konto darf keine Kampagnencharaktere teilen." };
    } else {
      const [saved] = await tx<EditorRow[]>`
        INSERT INTO sta_editor_characters
          (character_id, owner_user_id, visibility, revision, data, module_versions, deleted)
        VALUES (${mutation.characterId}::uuid, ${userId}, ${mutation.visibility}, 1,
                ${tx.json(mutation.data as ReturnType<typeof JSON.parse>)}, ${tx.json(mutation.moduleVersions as ReturnType<typeof JSON.parse>)}, ${mutation.deleted})
        RETURNING character_id, owner_user_id, visibility, revision, data, module_versions,
                  deleted, updated_at
      `;
      await tx`
        INSERT INTO sta_editor_changes
          (character_id, owner_user_id, visibility, revision, data, module_versions, deleted)
        VALUES (${saved.character_id}::uuid, ${saved.owner_user_id}, ${saved.visibility}, ${saved.revision},
                ${tx.json(saved.data as ReturnType<typeof JSON.parse>)}, ${tx.json(saved.module_versions as ReturnType<typeof JSON.parse>)}, ${saved.deleted})
      `;
      result = { opId: mutation.opId, status: "ok", character: toCharacter(saved) };
    }
    await tx`UPDATE sta_editor_sync_ops SET response = ${tx.json(result as ReturnType<typeof JSON.parse>)} WHERE op_id = ${mutation.opId}::uuid`;
    return result;
  });
}

export async function GET(request: Request) {
  const context = await getStaEditorContext();
  if (!context) return editorJson({ error: "Bitte melde dich bei LCARS an." }, 401);
  const url = new URL(request.url);
  const cursorValue = url.searchParams.get("cursor") || "0";
  if (!/^\d+$/.test(cursorValue) || !Number.isSafeInteger(Number(cursorValue))) return editorJson({ error: "Ungültiger Sync-Cursor." }, 400);
  const cursor = Number(cursorValue);
  const [upperRow] = await sql<{ upper_cursor: string | number }[]>`SELECT COALESCE(MAX(id), 0) AS upper_cursor FROM sta_editor_changes`;
  const upperCursor = Number(upperRow?.upper_cursor || 0);
  const rows = await sql<ChangeRow[]>`
    SELECT id, character_id, owner_user_id, visibility, revision, data, module_versions, deleted, changed_at AS updated_at
    FROM sta_editor_changes
    WHERE id > ${cursor} AND id <= ${upperCursor}
      AND (owner_user_id = ${context.user.id} OR (${context.canShareCampaign} AND visibility = 'campaign'))
    ORDER BY id ASC LIMIT ${PAGE_SIZE + 1}
  `;
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? Number(page[page.length - 1]?.id || cursor) : upperCursor;
  return Response.json({
    userId: context.user.id,
    canShareCampaign: context.canShareCampaign,
    canManageCharacters: context.canManageCharacters,
    changes: page.map((row) => ({ ...toCharacter(row), id: row.character_id })),
    nextCursor,
    hasMore,
  }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const context = await getStaEditorContext();
  if (!context) return editorJson({ error: "Bitte melde dich bei LCARS an." }, 401);
  let body: unknown;
  try {
    body = await readEditorJson(request);
  } catch (error) {
    return editorJson({ error: error instanceof Error ? error.message : "Ungültige Anfrage." }, 400);
  }
  if (!isRecord(body) || !Array.isArray(body.mutations) || body.mutations.length > 100) {
    return editorJson({ error: "Erwartet wird eine Liste mit höchstens 100 Änderungen." }, 400);
  }
  const mutations = body.mutations.map(parseMutation);
  if (mutations.some((mutation) => !mutation)) return editorJson({ error: "Eine Charakteränderung enthält ungültige Daten." }, 400);
  const validMutations = mutations as Mutation[];
  if (!context.canShareCampaign && validMutations.some((item) => item.visibility === "campaign")) {
    return editorJson({ error: "Dein Konto darf keine Kampagnencharaktere teilen." }, 403);
  }
  const results = [];
  for (const mutation of validMutations) {
    results.push(await saveMutation(
      mutation,
      context.user.id,
      context.canShareCampaign,
      context.canManageCharacters,
    ));
  }
  return Response.json({ results }, { headers: NO_STORE });
}

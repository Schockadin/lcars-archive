import sql from "@/lib/db";
import { editorJson, getStaEditorContext, isRecord, readEditorJson } from "@/lib/staCharEditorApi";
import { validateStaEditorModulePack } from "@/lib/staCharEditorValidation";

export const runtime = "nodejs";

interface ModuleRow {
  module_id: string;
  module_version: string;
  scope: "private" | "campaign";
  owner_user_id: number | null;
  is_active: boolean;
  pack: unknown;
  created_at: Date | string;
}

function toModule(row: ModuleRow) {
  return {
    moduleId: row.module_id,
    moduleVersion: row.module_version,
    scope: row.scope,
    ownerUserId: row.owner_user_id,
    active: row.is_active,
    pack: row.pack,
    updatedAt: row.created_at,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function GET() {
  const context = await getStaEditorContext();
  if (!context) return editorJson({ error: "Bitte melde dich bei LCARS an." }, 401);
  const rows = await sql<ModuleRow[]>`
    SELECT module_id, module_version, scope, owner_user_id, is_active, pack, created_at
    FROM sta_editor_modules
    WHERE (scope = 'private' AND owner_user_id = ${context.user.id})
       OR (scope = 'campaign' AND ${context.canShareCampaign})
    ORDER BY module_id ASC, module_version DESC
  `;
  const modules = rows.map(toModule);
  return Response.json({
    userId: context.user.id,
    canShareCampaign: context.canShareCampaign,
    canManageCharacters: context.canManageCharacters,
    canManageModules: context.canManageModules,
    modules,
    activeModules: modules.filter((module) => module.scope === "campaign" && module.active).map(({ moduleId, moduleVersion }) => ({ moduleId, moduleVersion })),
  }, { headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" } });
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
  if (!isRecord(body)) return editorJson({ error: "Modul-Anfrage fehlt." }, 400);
  const pack = validateStaEditorModulePack(body.pack);
  if (!pack) return editorJson({ error: "Das Modul ist ungültig oder enthält nicht unterstützte Inhalte." }, 400);
  const scope = body.scope === "campaign" ? "campaign" : body.scope === "private" ? "private" : null;
  if (!scope) return editorJson({ error: "Der Modulbereich muss private oder campaign sein." }, 400);
  const activate = body.activate === true;
  if (scope === "campaign" && !context.canManageModules) return editorJson({ error: "Nur Spielleitung oder Admin können Kampagnenmodule veröffentlichen." }, 403);
  if (activate && scope !== "campaign") return editorJson({ error: "Private Module können nicht kampagnenweit aktiviert werden." }, 400);

  const ownerId = scope === "private" ? context.user.id : null;
  const moduleId = pack.manifest.id;
  const version = pack.manifest.version;
  const saved = await sql.begin(async (tx) => {
    const existing = scope === "campaign"
      ? await tx<ModuleRow[]>`SELECT module_id, module_version, scope, owner_user_id, is_active, pack, created_at FROM sta_editor_modules WHERE scope = 'campaign' AND module_id = ${moduleId} AND module_version = ${version} FOR UPDATE`
      : await tx<ModuleRow[]>`SELECT module_id, module_version, scope, owner_user_id, is_active, pack, created_at FROM sta_editor_modules WHERE scope = 'private' AND owner_user_id = ${ownerId} AND module_id = ${moduleId} AND module_version = ${version} FOR UPDATE`;
    if (existing[0] && canonicalJson(existing[0].pack) !== canonicalJson(pack)) {
      return { error: "Eine veröffentlichte Modulversion ist unveränderlich. Erhöhe die Versionsnummer für Änderungen." };
    }

    if (scope === "campaign" && activate) {
      await tx`UPDATE sta_editor_modules SET is_active = FALSE WHERE scope = 'campaign' AND module_id = ${moduleId}`;
    }
    if (existing[0]) {
      if (scope === "campaign" && activate) {
        const [row] = await tx<ModuleRow[]>`
          UPDATE sta_editor_modules SET is_active = TRUE
          WHERE scope = 'campaign' AND module_id = ${moduleId} AND module_version = ${version}
          RETURNING module_id, module_version, scope, owner_user_id, is_active, pack, created_at
        `;
        return { module: toModule(row) };
      }
      // Publishing an existing inactive version without activation must leave the current version active.
      return { module: toModule(existing[0]) };
    }
    const [row] = await tx<ModuleRow[]>`
      INSERT INTO sta_editor_modules
        (module_id, module_version, title, scope, owner_user_id, is_active, pack, created_by)
      VALUES (${moduleId}, ${version}, ${pack.manifest.title}, ${scope}, ${ownerId}, ${scope === "campaign" && activate}, ${tx.json(pack as ReturnType<typeof JSON.parse>)}, ${context.user.id})
      RETURNING module_id, module_version, scope, owner_user_id, is_active, pack, created_at
    `;
    return { module: toModule(row) };
  });
  if ("error" in saved) return editorJson({ error: saved.error }, 409);
  return editorJson(saved, 201);
}

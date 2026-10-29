import "server-only";
import { getActiveUser } from "@/lib/dal";
import { getRoleMap } from "@/lib/roles";
import { userPermissions } from "@/lib/permissions";
import type { User } from "@/types/db";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Vary: "Cookie",
};

export function editorJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: PRIVATE_HEADERS });
}

export async function getStaEditorContext(): Promise<{
  user: User;
  canShareCampaign: boolean;
  canManageCharacters: boolean;
  canManageModules: boolean;
} | null> {
  const user = await getActiveUser();
  if (!user) return null;
  const permissions = userPermissions(user, await getRoleMap());
  const gm = permissions.has("gm.access");
  const admin = permissions.has("admin.access");
  return {
    user,
    canShareCampaign: permissions.has("users.browse") || gm || admin,
    canManageCharacters: gm || admin,
    canManageModules: gm || admin,
  };
}

export async function readEditorJson(request: Request, maxBytes = 1_100_000): Promise<unknown> {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw new Error("Die Anfrage ist zu groß.");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Ungültiges JSON.");
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEditorUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

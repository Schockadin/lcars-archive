"use server";
import { requireAdmin } from "@/lib/dal";
import { getBaseUrl } from "@/lib/http";

export interface RevalidateActionState {
  tags?: string[];
  error?: string;
}

// Admin-Panel-Auslöser für /api/revalidate — ruft den Endpoint bewusst per
// HTTP auf (statt revalidateAllContent() direkt zu importieren), damit der
// Button exakt den Codepfad testet/nutzt, den auch der Ingest und ein
// künftiger Cronjob verwenden (gleiches Secret, gleiche Route). getBaseUrl()
// liefert die Basis-URL der gerade laufenden Umgebung (dev/preview/prod) aus
// dem Host-Header — SITE_URL wäre hier ungeeignet, da es als
// kommaseparierte Liste für mehrere Ziele gedacht ist (siehe src/lib/http.ts).
export async function runRevalidateAction(
  _state: RevalidateActionState,
): Promise<RevalidateActionState> {
  await requireAdmin();

  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return { error: "REVALIDATE_SECRET ist nicht konfiguriert." };
  }

  try {
    const res = await fetch(`${await getBaseUrl()}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    const data = (await res.json()) as {
      revalidated?: boolean;
      tags?: string[];
      error?: string;
    };
    if (!res.ok || !data.revalidated) {
      return { error: data.error ?? `HTTP ${res.status}` };
    }
    return { tags: data.tags ?? [] };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Revalidate fehlgeschlagen.",
    };
  }
}

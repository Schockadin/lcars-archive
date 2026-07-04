import { NextRequest } from "next/server";
import { exportContentToVault } from "@/lib/vaultExport";

// Geschützter Endpoint für den Vault-Backup-Export — dieselbe Kernlogik wie
// der Admin-Panel-Button (src/app/users/VaultExportPanel.tsx), hier aber
// secret- statt session-authentifiziert und in einem Rutsch statt in
// Batches (kein Browser, der eine Fortschrittsanzeige bräuchte), damit er
// sich später z.B. per Cronjob (Netlify Scheduled Function, GitHub Action,
// externer Cron-Dienst) auslösen lässt, ohne einen eingeloggten Admin zu
// brauchen. Authentifizierung über VAULT_EXPORT_SECRET (als
// `Authorization: Bearer <secret>` oder `?secret=<secret>`) — identisches
// Muster zu /api/revalidate.
export const dynamic = "force-dynamic";
// Großzügiges Limit für einen kompletten, nicht in Batches aufgeteilten
// Export-Lauf — die tatsächliche Obergrenze setzt am Ende die
// Deployment-Plattform (Netlify).
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const secret = process.env.VAULT_EXPORT_SECRET;
  if (!secret) {
    return Response.json(
      { error: "VAULT_EXPORT_SECRET nicht konfiguriert" },
      { status: 500 },
    );
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await exportContentToVault();
  return Response.json(result);
}

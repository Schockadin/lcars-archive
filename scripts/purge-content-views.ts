// Entfernt personenbezogene Inhaltsaufrufe nach 90 Tagen. Läuft täglich im
// DB-Backup-Workflow (nach dem Backup); die Funktion selbst ist zusätzlich
// idempotent und kann bei Bedarf manuell gestartet werden.
import sql from "@/lib/db";

const RETENTION_DAYS = 90;

async function main() {
  const deleted = await sql`
    DELETE FROM content_view_events
    WHERE viewed_at < NOW() - INTERVAL '90 days'
  `;
  console.log(
    `🧹 Inhaltsaufrufe älter als ${RETENTION_DAYS} Tage gelöscht: ${deleted.count}`,
  );
}

main()
  .catch((error) => {
    console.error("✗ Bereinigung der Inhaltsaufrufe fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

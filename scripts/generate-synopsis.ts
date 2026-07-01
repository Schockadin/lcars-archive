// scripts/generate-synopsis.ts
//
// Generiert per Claude API eine Fließtext-Synopsis pro Mission aus deren
// Mission-Logs und schreibt sie in missions.synopsis. Eigenständiges Skript
// (npm run db:synopsis) — läuft unabhängig vom normalen Vault-Ingest, da es
// nur die bereits importierten Logs aus der DB liest, keinen Vault-Zugriff
// braucht.
//
// CLI:
//   npm run db:synopsis            → alle Missionen mit mind. 1 Log
//   npm run db:synopsis <slug>     → nur die angegebene Mission
//
// Vorhandene Synopsen werden immer überschrieben (kein Skip/--force nötig).
import postgres from "postgres";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_SYNOPSIS_MODEL ?? "claude-sonnet-4-5-20250929";

interface MissionRow {
  id: number;
  slug: string;
  title: string;
  status: string;
}

interface LogRow {
  title: string;
  author_name: string | null;
  log_date: string | null;
  session_nr: number | null;
  source_md: string | null;
  content: string;
}

function buildPrompt(mission: MissionRow, logs: LogRow[]): string {
  const logText = logs
    .map((log, i) => {
      const header = [
        `Log ${i + 1}`,
        log.session_nr != null ? `Session ${log.session_nr}` : null,
        log.log_date,
        log.author_name ? `Autor: ${log.author_name}` : null,
        log.title,
      ]
        .filter(Boolean)
        .join(" – ");
      return `### ${header}\n\n${(log.source_md ?? log.content).trim()}`;
    })
    .join("\n\n---\n\n");

  return `Du bist Chronist eines Star-Trek-Rollenspiel-Archivs. Fasse die folgenden \
Logbucheinträge (Tagebücher der beteiligten Charaktere) der Mission "${mission.title}" \
(Status: ${mission.status}) zu einer zusammenhängenden Synopsis zusammen.

Vorgaben:
- Schreibe auf Deutsch, in der Vergangenheitsform, aus neutraler Erzählerperspektive \
(nicht aus Sicht eines einzelnen Charakters).
- 2–4 Absätze Fließtext, keine Überschriften, keine Aufzählungen, keine Meta-Kommentare.
- Fasse den roten Faden der Ereignisse zusammen (was ist passiert, in welcher Reihenfolge, \
mit welchem Ergebnis), ohne dich in Nebendetails zu verlieren.
- Trenne Absätze durch eine Leerzeile.

Logbucheinträge (chronologisch):

${logText}`;
}

async function generateSynopsis(
  client: Anthropic,
  mission: MissionRow,
  logs: LogRow[],
): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(mission, logs) }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Leere Antwort vom Modell erhalten");
  }
  return text;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt");
  }

  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Weder DIRECT_DATABASE_URL noch DATABASE_URL ist gesetzt");
  }

  const targetSlug = process.argv[2];

  const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = new Anthropic({ apiKey });

  console.log("🚀 Starte Synopsis-Generierung...");
  if (targetSlug) console.log(`🎯 Nur Mission: ${targetSlug}`);

  let success = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const missions = await sql<MissionRow[]>`
      SELECT id, slug, title, status
      FROM missions
      WHERE ${targetSlug ? sql`slug = ${targetSlug}` : sql`TRUE`}
      ORDER BY started_at DESC NULLS LAST, created_at DESC
    `;

    if (missions.length === 0) {
      console.warn("⚠️  Keine passenden Missionen gefunden.");
      return;
    }

    for (const mission of missions) {
      const logs = await sql<LogRow[]>`
        SELECT
          ml.title,
          c.name AS author_name,
          ml.log_date::text AS log_date,
          ml.session_nr,
          ml.source_md,
          ml.content
        FROM mission_logs ml
        LEFT JOIN characters c ON c.id = ml.author_id
        WHERE ml.mission_id = ${mission.id}
        ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST, ml.id ASC
      `;

      if (logs.length === 0) {
        console.log(`  – ${mission.title}: keine Logs, übersprungen`);
        skipped++;
        continue;
      }

      try {
        const synopsis = await generateSynopsis(client, mission, logs);
        await sql`
          UPDATE missions SET synopsis = ${synopsis}, updated_at = NOW()
          WHERE id = ${mission.id}
        `;
        console.log(`  ✓ ${mission.title} (${logs.length} Logs)`);
        success++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`  ✗ ${mission.title}: ${message}`);
      }
    }

    console.log(`\n  → ${success} generiert, ${skipped} übersprungen`);
    if (errors.length > 0) {
      console.error("\n  Fehler:");
      errors.forEach((e) => console.error(e));
      process.exitCode = 1;
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("\n❌ Fataler Fehler:", error);
  process.exit(1);
});

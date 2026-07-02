import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import {
  markdownToHtml,
  validateSlug,
  parseDate,
  toStringArray,
} from "./shared.js";

// Typ für rohe Frontmatter-Daten der Mission-Container
interface MissionFrontmatter {
  type?: string;
  slug?: string;
  title?: string;
  status?: string;
  started_at?: string;
  ended_at?: string;
  tags?: string[];
}

export async function ingestMissions(
  sql: postgres.Sql,
  vaultPath: string,
  onlyNew = false,
): Promise<Set<string>> {
  const changedSlugs = new Set<string>();
  const dir = join(vaultPath, "Missionen");

  // Missionen liegen als Unterordner vor (z.B. Missionen/tanghal-iv/index.md),
  // deshalb erst die Verzeichnisse einsammeln statt direkt nach .md zu filtern
  const missionDirs = readdirSync(dir).filter((entry) =>
    statSync(join(dir, entry)).isDirectory(),
  );

  console.log(`\n🚀 Missionen: ${missionDirs.length} Ordner gefunden`);

  let success = 0;
  let skipped = 0;
  let alreadyExists = 0;
  const errors: string[] = [];

  for (const missionDir of missionDirs) {
    const filepath = join(dir, missionDir, "index.md");

    try {
      const raw = readFileSync(filepath, "utf8");
      const { data, content } = matter(raw);
      const fm = data as MissionFrontmatter;

      // Nur Notes mit type: mission verarbeiten
      if (fm.type !== "mission") {
        skipped++;
        continue;
      }

      // Pflichtfelder validieren
      const slug = validateSlug(fm.slug, filepath);

      if (!fm.title?.trim()) {
        throw new Error('Pflichtfeld "title" fehlt oder ist leer');
      }

      // Status validieren
      const validStatuses = ["active", "completed", "failed", "abandoned"];
      const status = fm.status ?? "active";
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Ungültiger status "${status}" – erlaubt: ${validStatuses.join(", ")}`,
        );
      }

      // Markdown-Body (z.B. ausführliche Beschreibung) zu HTML
      const summaryHtml = await markdownToHtml(content);

      const metadata = {
        tags: toStringArray(fm.tags),
        body: summaryHtml,
      };

      // Upsert: existiert → update, neu → insert. Im onlyNew-Modus wird ein
      // bereits existierender Slug stattdessen komplett übersprungen (DO
      // NOTHING liefert dann keine Zeile zurück).
      const conflictClause = onlyNew
        ? sql`ON CONFLICT (slug) DO NOTHING`
        : sql`ON CONFLICT (slug) DO UPDATE SET
            title       = EXCLUDED.title,
            status      = EXCLUDED.status,
            started_at  = EXCLUDED.started_at,
            ended_at    = EXCLUDED.ended_at,
            metadata    = EXCLUDED.metadata,
            source_md   = EXCLUDED.source_md,
            frontmatter = EXCLUDED.frontmatter,
            updated_at  = NOW()`;

      // "old" wird als CTE VOR der Modifikation gegen den Tabellenstand zu
      // Beginn des Statements ausgewertet — liefert also zuverlässig den
      // Vor-Update-Zustand für den Änderungs-Vergleich unten, ohne separaten
      // Roundtrip oder Race Condition gegenüber dem eigentlichen Upsert.
      const [row] = await sql`
        WITH old AS (
          SELECT title, status, started_at, ended_at, metadata->>'body' AS body
          FROM missions WHERE slug = ${slug}
        )
        INSERT INTO missions (
          slug, title, status,
          started_at, ended_at, metadata,
          source_md, frontmatter, updated_at
        ) VALUES (
          ${slug},
          ${fm.title.trim()},
          ${status},
          ${parseDate(fm.started_at)},
          ${parseDate(fm.ended_at)},
          ${sql.json(metadata)},
          ${content},
          ${sql.json(data)},
          NOW()
        )
        ${conflictClause}
        RETURNING
          slug,
          (SELECT title FROM old) AS old_title,
          (SELECT status FROM old) AS old_status,
          (SELECT started_at FROM old) AS old_started_at,
          (SELECT ended_at FROM old) AS old_ended_at,
          (SELECT body FROM old) AS old_body
      `;

      if (!row) {
        alreadyExists++;
        continue;
      }

      const hadOldRow = row.old_title != null;
      if (hadOldRow) {
        const oldStartedAt = row.old_started_at
          ? new Date(row.old_started_at).toISOString().slice(0, 10)
          : null;
        const oldEndedAt = row.old_ended_at
          ? new Date(row.old_ended_at).toISOString().slice(0, 10)
          : null;
        const changed =
          row.old_title !== fm.title.trim() ||
          row.old_status !== status ||
          oldStartedAt !== parseDate(fm.started_at) ||
          oldEndedAt !== parseDate(fm.ended_at) ||
          row.old_body !== summaryHtml;
        if (changed) changedSlugs.add(slug);
      }

      console.log(`  ✓ ${fm.title}`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${missionDir}: ${message}`);
    }
  }

  console.log(
    `  → ${success} importiert, ${skipped} übersprungen` +
      (onlyNew ? `, ${alreadyExists} bereits vorhanden` : ""),
  );
  if (errors.length > 0) {
    console.error("\n  Fehler:");
    errors.forEach((e) => console.error(e));
  }

  return changedSlugs;
}

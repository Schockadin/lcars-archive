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
): Promise<void> {
  const dir = join(vaultPath, "Missionen");

  // Missionen liegen als Unterordner vor (z.B. Missionen/tanghal-iv/index.md),
  // deshalb erst die Verzeichnisse einsammeln statt direkt nach .md zu filtern
  const missionDirs = readdirSync(dir).filter((entry) =>
    statSync(join(dir, entry)).isDirectory(),
  );

  console.log(`\n🚀 Missionen: ${missionDirs.length} Ordner gefunden`);

  let success = 0;
  let skipped = 0;
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

      // Upsert: existiert → update, neu → insert
      await sql`
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
        ON CONFLICT (slug) DO UPDATE SET
          title       = EXCLUDED.title,
          status      = EXCLUDED.status,
          started_at  = EXCLUDED.started_at,
          ended_at    = EXCLUDED.ended_at,
          metadata    = EXCLUDED.metadata,
          source_md   = EXCLUDED.source_md,
          frontmatter = EXCLUDED.frontmatter,
          updated_at  = NOW()
      `;

      console.log(`  ✓ ${fm.title}`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${missionDir}: ${message}`);
    }
  }

  console.log(`  → ${success} importiert, ${skipped} übersprungen`);
  if (errors.length > 0) {
    console.error("\n  Fehler:");
    errors.forEach((e) => console.error(e));
  }
}

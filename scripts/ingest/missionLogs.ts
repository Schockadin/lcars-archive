import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";
import { markdownToHtml, validateSlug, parseDate } from "./shared.js";

export interface MissionLogFrontmatter {
  type?: string;
  mission?: string;
  title?: string;
  author?: string;
  log_date?: string;
  session_nr?: number;
  tags?: string[];
}

// Neu: benannter Typ für die Kollisionsprüfung
export interface ExistingMissionLogRow {
  title: string;
  updated_at: Date;
}

// Eine Zeile readline-Interface für die gesamte Skript-Laufzeit,
// statt pro Kollision neu zu öffnen/schließen
const rl = createInterface({ input: stdin, output: stdout });

async function askOverwrite(
  slug: string,
  existing: { title: string; updated_at: Date },
  incoming: { title: string; filepath: string },
): Promise<boolean> {
  console.log(`\n  ⚠ Kollision bei Slug "${slug}"`);
  console.log(
    `    Bestehend: "${existing.title}" (zuletzt aktualisiert: ${existing.updated_at.toLocaleString("de-DE")})`,
  );
  console.log(`    Neu:       "${incoming.title}" (${incoming.filepath})`);

  const answer = await rl.question("    Überschreiben? [j/N] ");
  return answer.trim().toLowerCase() === "j";
}

export async function ingestMissionLogs(
  sql: postgres.Sql,
  vaultPath: string,
): Promise<void> {
  const dir = join(vaultPath, "Missionen");

  const missionDirs = readdirSync(dir).filter((entry) =>
    statSync(join(dir, entry)).isDirectory(),
  );

  const logFiles: { filepath: string; missionDir: string }[] = [];
  for (const missionDir of missionDirs) {
    const fullDir = join(dir, missionDir);
    const files = readdirSync(fullDir).filter(
      (f) => extname(f) === ".md" && f !== "index.md",
    );
    for (const file of files) {
      logFiles.push({ filepath: join(fullDir, file), missionDir });
    }
  }

  console.log(`\n📓 Mission-Logs: ${logFiles.length} Dateien gefunden`);

  let success = 0;
  let skipped = 0;
  let discarded = 0;
  const errors: string[] = [];

  for (const { filepath, missionDir } of logFiles) {
    try {
      const raw = readFileSync(filepath, "utf8");
      const { data, content } = matter(raw);
      const fm = data as MissionLogFrontmatter;

      if (fm.type !== "mission-log") {
        skipped++;
        continue;
      }

      if (!fm.title?.trim()) {
        throw new Error('Pflichtfeld "title" fehlt oder ist leer');
      }
      if (!fm.mission?.trim()) {
        throw new Error('Pflichtfeld "mission" (Referenz-Slug) fehlt');
      }
      if (!fm.author?.trim()) {
        throw new Error(
          'Pflichtfeld "author" fehlt – wird für den Slug benötigt',
        );
      }
      if (!fm.session_nr) {
        throw new Error(
          'Pflichtfeld "session_nr" fehlt – wird für den Slug benötigt',
        );
      }

      const [missionRow] = await sql<{ id: number }[]>`
        SELECT id FROM missions WHERE slug = ${fm.mission.trim()}
      `;
      if (!missionRow) {
        throw new Error(
          `Mission mit slug "${fm.mission}" nicht gefunden – wurde sie schon importiert? (Ordner: ${missionDir})`,
        );
      }

      const [authorRow] = await sql<{ id: number }[]>`
        SELECT id FROM characters WHERE slug = ${fm.author.trim()}
      `;
      if (!authorRow) {
        throw new Error(`Charakter mit slug "${fm.author}" nicht gefunden`);
      }

      const generatedSlug = `${fm.author.trim()}-${fm.mission.trim()}-${fm.session_nr}`;
      const slug = validateSlug(generatedSlug, filepath);

      // ── Kollisionsprüfung ──
      // Existiert der Slug bereits, UND unterscheidet sich der Titel?
      // (gleicher Titel = wahrscheinlich derselbe Log, einfach erneut importiert → kein Nachfragen nötig)
      const [existingRow] = await sql<
        ExistingMissionLogRow[]
      >`SELECT title, updated_at FROM mission_logs WHERE slug = ${slug}`;

      if (existingRow && existingRow.title !== fm.title.trim()) {
        const overwrite = await askOverwrite(slug, existingRow, {
          title: fm.title.trim(),
          filepath,
        });

        if (!overwrite) {
          console.log(`    → verworfen`);
          discarded++;
          continue;
        }
        console.log(`    → wird überschrieben`);
      }

      const contentHtml = await markdownToHtml(content);

      const metadata = {
        tags: fm.tags ?? [],
      };

      await sql`
        INSERT INTO mission_logs (
          slug, mission_id, author_id, title,
          content, log_date, session_nr, metadata,
          source_md, frontmatter, updated_at
        ) VALUES (
          ${slug},
          ${missionRow.id},
          ${authorRow.id},
          ${fm.title.trim()},
          ${contentHtml},
          ${parseDate(fm.log_date)},
          ${fm.session_nr},
          ${JSON.stringify(metadata)},
          ${content},
          ${JSON.stringify(data)},
          NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          mission_id  = EXCLUDED.mission_id,
          author_id   = EXCLUDED.author_id,
          title       = EXCLUDED.title,
          content     = EXCLUDED.content,
          log_date    = EXCLUDED.log_date,
          session_nr  = EXCLUDED.session_nr,
          metadata    = EXCLUDED.metadata,
          source_md   = EXCLUDED.source_md,
          frontmatter = EXCLUDED.frontmatter,
          updated_at  = NOW()
      `;

      console.log(`  ✓ ${slug}: ${fm.title}`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${filepath}: ${message}`);
    }
  }

  rl.close();

  console.log(
    `  → ${success} importiert, ${skipped} übersprungen, ${discarded} verworfen`,
  );
  if (errors.length > 0) {
    console.error("\n  Fehler:");
    errors.forEach((e) => console.error(e));
  }
}

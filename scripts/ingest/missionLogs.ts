import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import { createInterface, type Interface } from "readline/promises";
import { stdin, stdout } from "process";
import { markdownToHtml, validateSlug, parseDate, resolveOwner } from "./shared";

export interface MissionLogFrontmatter {
  type?: string;
  mission?: string;
  title?: string;
  author?: string;
  log_date?: string;
  session_nr?: number;
  tags?: string[];
  owner?: string;
}

// Neu: benannter Typ für die Kollisionsprüfung
export interface ExistingMissionLogRow {
  title: string;
  updated_at: Date;
}

async function askOverwrite(
  rl: Interface,
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

export interface IngestMissionLogsResult {
  missionSlugs: Set<string>;
  characterSlugs: Set<string>;
  newLogSlugs: Set<string>;
}

export async function ingestMissionLogs(
  sql: postgres.Sql,
  vaultPath: string,
  onlyNew = false,
): Promise<IngestMissionLogsResult> {
  // Mission-Slugs, die einen brandneuen Log bekommen haben (in beiden Modi
  // relevant — Abonnenten einer Mission sollen auch bei "nur neue Dateien"-
  // Läufen benachrichtigt werden). charactersWithNewLogs/newLogSlugs
  // analog für Charakter-Abos (siehe notify.ts) — newLogSlugs exakt statt
  // über die Mission-ID gefiltert, damit bei Missionen mit mehreren Autoren
  // nicht auch ältere Logs des abonnierten Charakters fälschlich erneut
  // auftauchen.
  const missionsWithNewLogs = new Set<string>();
  const charactersWithNewLogs = new Set<string>();
  const newLogSlugs = new Set<string>();
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

  // readline-Interface erst hier öffnen (nicht auf Modulebene), damit der
  // Import dieses Moduls keinen offenen stdin-Handle erzeugt — sonst würde
  // ein granularer Lauf ohne Mission-Logs nicht sauber beenden.
  const rl = createInterface({ input: stdin, output: stdout });

  let success = 0;
  let skipped = 0;
  let discarded = 0;
  let alreadyExists = 0;
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

      const [authorRow] = await sql<{ id: number; player_id: number | null }[]>`
        SELECT id, player_id FROM characters WHERE slug = ${fm.author.trim()}
      `;
      if (!authorRow) {
        throw new Error(`Charakter mit slug "${fm.author}" nicht gefunden`);
      }

      // owner: explizites Frontmatter-Feld hat Vorrang; ohne das Feld fällt
      // der Owner auf den Spieler des Autor-Charakters zurück (naheliegende
      // Annahme: wer den Log geschrieben hat, "besitzt" ihn auch).
      const ownerUserId =
        (await resolveOwner(sql, fm.owner)) ?? authorRow.player_id;

      const generatedSlug = `${fm.author.trim()}-${fm.mission.trim()}-${fm.session_nr}`;
      const slug = validateSlug(generatedSlug, filepath);

      // ── Kollisionsprüfung ──
      // Existiert der Slug bereits, UND unterscheidet sich der Titel?
      // (gleicher Titel = wahrscheinlich derselbe Log, einfach erneut importiert → kein Nachfragen nötig)
      const [existingRow] = await sql<
        ExistingMissionLogRow[]
      >`SELECT title, updated_at FROM mission_logs WHERE slug = ${slug}`;

      // Im onlyNew-Modus wird ein bereits existierender Slug direkt
      // übersprungen — kein Kollisions-Prompt nötig (wichtig für
      // nicht-interaktive Nutzung).
      if (onlyNew && existingRow) {
        alreadyExists++;
        continue;
      }

      if (existingRow && existingRow.title !== fm.title.trim()) {
        const overwrite = await askOverwrite(rl, slug, existingRow, {
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

      // Zusätzliche Absicherung neben der Kollisionsprüfung oben (z.B. bei
      // gleichem Titel, wo kein Prompt ausgelöst wird): im onlyNew-Modus
      // trotzdem nie überschreiben.
      const conflictClause = onlyNew
        ? sql`ON CONFLICT (slug) DO NOTHING`
        : sql`ON CONFLICT (slug) DO UPDATE SET
            mission_id    = EXCLUDED.mission_id,
            author_id     = EXCLUDED.author_id,
            title         = EXCLUDED.title,
            content       = EXCLUDED.content,
            log_date      = EXCLUDED.log_date,
            session_nr    = EXCLUDED.session_nr,
            metadata      = EXCLUDED.metadata,
            source_md     = EXCLUDED.source_md,
            frontmatter   = EXCLUDED.frontmatter,
            owner_user_id = EXCLUDED.owner_user_id,
            updated_at    = NOW()`;

      const [row] = await sql`
        INSERT INTO mission_logs (
          slug, mission_id, author_id, title,
          content, log_date, session_nr, metadata,
          source_md, frontmatter, owner_user_id, updated_at
        ) VALUES (
          ${slug},
          ${missionRow.id},
          ${authorRow.id},
          ${fm.title.trim()},
          ${contentHtml},
          ${parseDate(fm.log_date)},
          ${fm.session_nr},
          ${sql.json(metadata)},
          ${content},
          ${sql.json(data)},
          ${ownerUserId},
          NOW()
        )
        ${conflictClause}
        RETURNING slug
      `;

      if (!row) {
        alreadyExists++;
        continue;
      }

      if (!existingRow) {
        missionsWithNewLogs.add(fm.mission.trim());
        charactersWithNewLogs.add(fm.author.trim());
        newLogSlugs.add(slug);
      }

      console.log(`  ✓ ${slug}: ${fm.title}`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${filepath}: ${message}`);
    }
  }

  rl.close();

  console.log(
    `  → ${success} importiert, ${skipped} übersprungen, ${discarded} verworfen` +
      (onlyNew ? `, ${alreadyExists} bereits vorhanden` : ""),
  );
  if (errors.length > 0) {
    console.error("\n  Fehler:");
    errors.forEach((e) => console.error(e));
  }

  return {
    missionSlugs: missionsWithNewLogs,
    characterSlugs: charactersWithNewLogs,
    newLogSlugs,
  };
}

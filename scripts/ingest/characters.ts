import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import {
  markdownToHtml,
  validateSlug,
  parseDate,
  toStringArray,
  toNumberArray,
} from "./shared.js";

// Typ für rohe Frontmatter-Daten
interface CharacterFrontmatter {
  type?: string;
  slug?: string;
  status?: string;
  name?: string;
  rank?: string;
  species?: string | string[];
  homeworld?: string;
  age?: number;
  affiliation?: {
    factions?: string | string[];
    ships?: string | string[];
    division?: string;
  };
  player?: string;
  portrait?: string;
  tags?: string[];
  aliases?: string[];
  generation?: number[];
}

export async function ingestCharacters(
  sql: postgres.Sql,
  vaultPath: string,
): Promise<void> {
  const dir = join(vaultPath, "Charaktere");

  const files = readdirSync(dir).filter((f) => extname(f) === ".md");

  console.log(`\n👤 Charaktere: ${files.length} Dateien gefunden`);

  let success = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    const filepath = join(dir, file);

    try {
      const raw = readFileSync(filepath, "utf8");
      const { data, content } = matter(raw);
      const fm = data as CharacterFrontmatter;

      if (fm.type !== "character") {
        skipped++;
        continue;
      }

      const slug = validateSlug(fm.slug, file);

      if (!fm.name?.trim()) {
        throw new Error('Pflichtfeld "name" fehlt oder ist leer');
      }

      // Status validieren
      const validStatuses = ["active", "retired", "deceased"];
      const status = fm.status ?? "active";
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Ungültiger status "${status}" – erlaubt: ${validStatuses.join(", ")}`,
        );
      }

      // Markdown-Body zu HTML
      const bio = await markdownToHtml(content);

      // Metadata zusammenstellen – alles was keine eigene Spalte hat
      const metadata = {
        rank: fm.rank ?? null,
        species: toStringArray(fm.species),
        homeworld: fm.homeworld ?? null,
        age: fm.age ?? null,
        affiliation: fm.affiliation
          ? {
              factions: toStringArray(fm.affiliation.factions),
              ships: toStringArray(fm.affiliation.ships),
              division: fm.affiliation.division ?? null,
            }
          : null,
        player: fm.player ?? null,
        tags: toStringArray(fm.tags),
        aliases: toStringArray(fm.aliases),
        generation: toNumberArray(fm.generation),
      };

      // Upsert: existiert → update, neu → insert
      await sql`
        INSERT INTO characters (
          slug, name, status, portrait, bio, metadata,
          updated_at
        ) VALUES (
          ${slug},
          ${fm.name.trim()},
          ${status},
          ${fm.portrait?.trim() || null},
          ${bio},
          ${JSON.stringify(metadata)},
          NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          name       = EXCLUDED.name,
          status     = EXCLUDED.status,
          portrait   = EXCLUDED.portrait,
          bio        = EXCLUDED.bio,
          metadata   = EXCLUDED.metadata,
          updated_at = NOW()
      `;

      console.log(`  ✓ ${fm.name}`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${file}: ${message}`);
    }
  }

  // Zusammenfassung
  console.log(`  → ${success} importiert, ${skipped} übersprungen`);
  if (errors.length > 0) {
    console.error("\n  Fehler:");
    errors.forEach((e) => console.error(e));
  }
}

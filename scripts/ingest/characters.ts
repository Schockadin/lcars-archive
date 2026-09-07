import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import {
  markdownToHtml,
  validateSlug,
  toStringArray,
  toNumberArray,
} from "./shared";
import { needsPortraitImport } from "@/lib/portraitSource";
import {
  importPortraitFromUrl,
  PortraitImportError,
} from "@/lib/portraitImport";

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
  onlyNew = false,
): Promise<void> {
  const dir = join(vaultPath, "Charaktere");

  const files = readdirSync(dir).filter((f) => extname(f) === ".md");

  console.log(`\n👤 Charaktere: ${files.length} Dateien gefunden`);

  let success = 0;
  let skipped = 0;
  let alreadyExists = 0;
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

      // Ein Portrait aus dem Frontmatter ist eine ADRESSE. Gespeichert wird
      // stattdessen ein eigener Upload — ein Bild auf einem fremden Server
      // verschwindet, sobald dort jemand aufräumt, und lässt sich im Editor
      // nicht zuschneiden. Schlägt das fehl, bleibt das Portrait leer und der
      // Lauf sagt es: die Adresse steht weiterhin in der Datei, ein zweiter
      // Anlauf holt sie nach.
      let portrait = fm.portrait?.trim() || null;
      if (needsPortraitImport(portrait, process.env.R2_ASSET_PUBLIC_BASE_URL)) {
        try {
          portrait = await importPortraitFromUrl(portrait!);
        } catch (err) {
          console.warn(
            `  ⚠️  ${slug}: Portrait "${fm.portrait}" nicht übernommen ` +
              `(${err instanceof PortraitImportError ? err.message : String(err)}) — bleibt leer.`,
          );
          portrait = null;
        }
      }

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

      // Upsert: existiert → update, neu → insert. Im onlyNew-Modus wird ein
      // bereits existierender Slug stattdessen komplett übersprungen (DO
      // NOTHING liefert dann keine Zeile zurück).
      const conflictClause = onlyNew
        ? sql`ON CONFLICT (slug) DO NOTHING`
        : sql`ON CONFLICT (slug) DO UPDATE SET
            name        = EXCLUDED.name,
            status      = EXCLUDED.status,
            portrait    = EXCLUDED.portrait,
            bio         = EXCLUDED.bio,
            metadata    = EXCLUDED.metadata,
            source_md   = EXCLUDED.source_md,
            frontmatter = EXCLUDED.frontmatter,
            updated_at  = NOW()`;

      const [row] = await sql`
        INSERT INTO characters (
          slug, name, status, portrait, bio, metadata,
          source_md, frontmatter, updated_at
        ) VALUES (
          ${slug},
          ${fm.name.trim()},
          ${status},
          ${portrait},
          ${bio},
          ${sql.json(metadata)},
          ${content},
          ${sql.json(data)},
          NOW()
        )
        ${conflictClause}
        RETURNING slug
      `;

      if (!row) {
        alreadyExists++;
        continue;
      }

      console.log(`  ✓ ${fm.name}`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${file}: ${message}`);
    }
  }

  // Zusammenfassung
  console.log(
    `  → ${success} importiert, ${skipped} übersprungen` +
      (onlyNew ? `, ${alreadyExists} bereits vorhanden` : ""),
  );
  if (errors.length > 0) {
    console.error("\n  Fehler:");
    errors.forEach((e) => console.error(e));
  }
}

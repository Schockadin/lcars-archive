import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import { markdownToHtml, validateSlug, toStringArray } from "./shared.js";

// Gültige Kategorien — muss exakt dem CHECK-Constraint in schema.sql sowie
// ArchiveCategory in src/types/archive.ts entsprechen.
const VALID_CATEGORIES = [
  "person",
  "location",
  "item",
  "faction",
  "theory",
  "event",
  "species",
  "other",
];

// Top-Level-Ordner unter "Archiv/" → Kategorie. Greift, wenn das Frontmatter
// keine (gültige) category nennt (z.B. das Orte-Template ohne category-Feld).
const FOLDER_CATEGORY: Record<string, string> = {
  dialoge: "other",
  fraktionen: "faction",
  items: "item",
  lore: "other",
  npcs: "person",
  orte: "location",
  schiffe: "location",
  spezies: "species",
};

interface FieldSpec {
  key: string;
  label: string;
}

// Skalar-Attribute zur Anzeige (Label im Eintrag gespeichert). status ist für
// alle Kategorien relevant und wird vorangestellt.
const COMMON_ATTRIBUTES: FieldSpec[] = [{ key: "status", label: "Status" }];

const CATEGORY_ATTRIBUTES: Record<string, FieldSpec[]> = {
  person: [],
  location: [
    { key: "location_type", label: "Art" },
    { key: "class", label: "Klasse" },
    { key: "system", label: "System" },
    { key: "sector", label: "Sektor" },
    { key: "quadrant", label: "Quadrant" },
    { key: "coordinates", label: "Koordinaten" },
    { key: "affiliation", label: "Zugehörigkeit" },
    { key: "atmosphere", label: "Atmosphäre" },
    { key: "population", label: "Bevölkerung" },
    { key: "first_contact", label: "Erstkontakt" },
  ],
  item: [{ key: "item_type", label: "Art" }],
  faction: [{ key: "faction_type", label: "Art" }],
  species: [
    { key: "species_type", label: "Art" },
    { key: "classification", label: "Klassifikation" },
    { key: "homeworld", label: "Heimatwelt" },
  ],
  theory: [{ key: "lore_type", label: "Art" }],
  event: [{ key: "lore_type", label: "Art" }],
  other: [
    { key: "lore_type", label: "Art" },
    { key: "setting", label: "Schauplatz" },
    { key: "log_date", label: "Datum" },
  ],
};

// Slug-Referenzfelder. Jeder Wert wird im 2. Pass aufgelöst: Archiv-Eintrag →
// archive_links (mit diesem Label), Charakter/Mission → in der Metadata.
const COMMON_REFERENCES: FieldSpec[] = [
  { key: "related_missions", label: "Mission" },
  { key: "related_characters", label: "Charakter" },
  { key: "related_npcs", label: "NPC" },
  { key: "related_locations", label: "Ort" },
  { key: "related_species", label: "Spezies" },
  { key: "related_factions", label: "Fraktion" },
  { key: "related_items", label: "Objekt" },
  { key: "related_lore", label: "Lore" },
];

const CATEGORY_REFERENCES: Record<string, FieldSpec[]> = {
  person: [],
  location: [{ key: "controlled_by", label: "Kontrolliert von" }],
  item: [
    { key: "origin", label: "Ursprung" },
    { key: "location", label: "Standort" },
  ],
  faction: [
    { key: "leader", label: "Anführer" },
    { key: "headquarters", label: "Hauptsitz" },
    { key: "member_species", label: "Mitglieds-Spezies" },
  ],
  species: [{ key: "affiliation", label: "Zugehörigkeit" }],
  theory: [],
  event: [],
  other: [{ key: "participants", label: "Teilnehmer" }],
};

// ── kleine Helfer ─────────────────────────────────────────────────────
function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// Attribut-Wert hübsch als String (Date → YYYY-MM-DD, Array → Liste).
function attrValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => str(v)).filter((v): v is string => !!v);
    return parts.length ? parts.join(", ") : null;
  }
  return str(value);
}

// Alle .md-Dateien einsammeln; folder = Top-Level-Ordner unter "Archiv/".
function collectMarkdown(
  baseDir: string,
): { filepath: string; folder: string | null }[] {
  const out: { filepath: string; folder: string | null }[] = [];

  function walk(dir: string, folder: string | null) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, folder ?? entry.toLowerCase());
      } else if (extname(entry) === ".md") {
        out.push({ filepath: full, folder });
      }
    }
  }

  walk(baseDir, null);
  return out;
}

type ResolvedRef =
  | { kind: "archive"; id: number }
  | { kind: "character"; name: string }
  | { kind: "mission"; title: string }
  | { kind: "none" };

export async function ingestArchive(
  sql: postgres.Sql,
  vaultPath: string,
): Promise<void> {
  const dir = join(vaultPath, "Archiv");

  const files = collectMarkdown(dir);

  console.log(`\n📚 Archiv: ${files.length} Dateien gefunden`);

  let success = 0;
  let skipped = 0;
  const errors: string[] = [];

  const slugToId = new Map<string, number>();
  const processedIds: number[] = [];
  const references: { sourceSlug: string; target: string; label: string }[] =
    [];

  // ── Pass 1: Einträge upserten ──
  for (const { filepath, folder } of files) {
    try {
      const raw = readFileSync(filepath, "utf8");
      const { data, content } = matter(raw);
      const fm = data as Record<string, unknown>;

      // Nur Notes mit type: archive verarbeiten
      if (str(fm.type) !== "archive") {
        skipped++;
        continue;
      }

      const slug = validateSlug(fm.slug, filepath);

      const title = str(fm.title);
      if (!title) {
        throw new Error('Pflichtfeld "title" fehlt oder ist leer');
      }

      // category: Frontmatter (falls gültig) → sonst aus dem Ordner ableiten.
      const fmCategory = str(fm.category);
      const folderCategory = folder ? FOLDER_CATEGORY[folder] : undefined;
      const category =
        fmCategory && VALID_CATEGORIES.includes(fmCategory)
          ? fmCategory
          : (folderCategory ?? "other");
      if (!VALID_CATEGORIES.includes(category)) {
        throw new Error(
          `Kategorie nicht bestimmbar (category="${fmCategory ?? ""}", Ordner="${folder ?? ""}")`,
        );
      }

      const contentHtml = await markdownToHtml(content);
      const tags = toStringArray(fm.tags);

      // Anzeige-Attribute einsammeln (nur vorhandene Werte, in fester Reihenfolge).
      const attrSpecs = [
        ...COMMON_ATTRIBUTES,
        ...(CATEGORY_ATTRIBUTES[category] ?? []),
      ];
      const attributes = attrSpecs
        .map((spec) => ({ label: spec.label, value: attrValue(fm[spec.key]) }))
        .filter((a): a is { label: string; value: string } => a.value != null);

      const metadata = {
        summary: str(fm.teaser),
        attributes,
        characters: [] as { slug: string; name: string }[],
        missions: [] as { slug: string; title: string }[],
      };

      const [row] = await sql<{ id: number }[]>`
        INSERT INTO archive_entries (
          slug, title, category, content, tags, metadata,
          source_md, frontmatter, updated_at
        ) VALUES (
          ${slug},
          ${title},
          ${category},
          ${contentHtml},
          ${tags},
          ${JSON.stringify(metadata)},
          ${content},
          ${JSON.stringify(data)},
          NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          title       = EXCLUDED.title,
          category    = EXCLUDED.category,
          content     = EXCLUDED.content,
          tags        = EXCLUDED.tags,
          metadata    = EXCLUDED.metadata,
          source_md   = EXCLUDED.source_md,
          frontmatter = EXCLUDED.frontmatter,
          updated_at  = NOW()
        RETURNING id
      `;

      slugToId.set(slug, row.id);
      processedIds.push(row.id);

      // Referenz-Slugs einsammeln (im 2. Pass aufgelöst).
      const refSpecs = [
        ...(CATEGORY_REFERENCES[category] ?? []),
        ...COMMON_REFERENCES,
      ];
      for (const spec of refSpecs) {
        for (const target of toStringArray(fm[spec.key])) {
          const t = target.trim();
          if (t) references.push({ sourceSlug: slug, target: t, label: spec.label });
        }
      }

      console.log(`  ✓ ${title} [${category}]`);
      success++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`  ✗ ${filepath}: ${message}`);
    }
  }

  // ── Pass 2: Verweise auflösen ──
  if (processedIds.length > 0) {
    await sql`DELETE FROM archive_links WHERE source_id = ANY(${processedIds})`;
  }

  // Auflösung eines Slugs: zuerst Archiv, dann Charakter, dann Mission.
  const refCache = new Map<string, ResolvedRef>();
  async function resolveRef(slug: string): Promise<ResolvedRef> {
    const cached = refCache.get(slug);
    if (cached) return cached;

    let res: ResolvedRef = { kind: "none" };
    const archiveId =
      slugToId.get(slug) ??
      (await sql<{ id: number }[]>`SELECT id FROM archive_entries WHERE slug = ${slug}`)[0]
        ?.id;
    if (archiveId != null) {
      slugToId.set(slug, archiveId);
      res = { kind: "archive", id: archiveId };
    } else {
      const [c] = await sql<{ name: string }[]>`
        SELECT name FROM characters WHERE slug = ${slug}
      `;
      if (c) {
        res = { kind: "character", name: c.name };
      } else {
        const [m] = await sql<{ title: string }[]>`
          SELECT title FROM missions WHERE slug = ${slug}
        `;
        if (m) res = { kind: "mission", title: m.title };
      }
    }
    refCache.set(slug, res);
    return res;
  }

  // Pro Quell-Eintrag gesammelte Charakter-/Missions-Verweise.
  const sideRefs = new Map<
    string,
    {
      characters: Map<string, string>;
      missions: Map<string, string>;
    }
  >();
  function sideFor(sourceSlug: string) {
    let s = sideRefs.get(sourceSlug);
    if (!s) {
      s = { characters: new Map(), missions: new Map() };
      sideRefs.set(sourceSlug, s);
    }
    return s;
  }

  let linkCount = 0;
  for (const ref of references) {
    const sourceId = slugToId.get(ref.sourceSlug);
    if (sourceId == null) continue;

    const resolved = await resolveRef(ref.target);
    if (resolved.kind === "archive") {
      if (resolved.id === sourceId) continue; // Selbstverweis überspringen
      await sql`
        INSERT INTO archive_links (source_id, target_id, label)
        VALUES (${sourceId}, ${resolved.id}, ${ref.label})
        ON CONFLICT (source_id, target_id) DO UPDATE SET label = EXCLUDED.label
      `;
      linkCount++;
    } else if (resolved.kind === "character") {
      sideFor(ref.sourceSlug).characters.set(ref.target, resolved.name);
    } else if (resolved.kind === "mission") {
      sideFor(ref.sourceSlug).missions.set(ref.target, resolved.title);
    } else {
      errors.push(
        `  ⚠ Verweis "${ref.sourceSlug}" → "${ref.target}": nicht gefunden`,
      );
    }
  }

  // Charakter-/Missions-Verweise in die Metadata der Quelle schreiben.
  for (const [sourceSlug, side] of sideRefs) {
    const id = slugToId.get(sourceSlug);
    if (id == null) continue;
    if (side.characters.size === 0 && side.missions.size === 0) continue;

    const extra = {
      characters: [...side.characters].map(([slug, name]) => ({ slug, name })),
      missions: [...side.missions].map(([slug, title]) => ({ slug, title })),
    };
    await sql`
      UPDATE archive_entries
      SET metadata = metadata || ${JSON.stringify(extra)}::jsonb
      WHERE id = ${id}
    `;
  }

  console.log(
    `  → ${success} importiert, ${skipped} übersprungen, ${linkCount} Verweise`,
  );
  if (errors.length > 0) {
    console.error("\n  Hinweise:");
    errors.forEach((e) => console.error(e));
  }
}

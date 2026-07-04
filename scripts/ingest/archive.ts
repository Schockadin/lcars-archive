import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";
import postgres from "postgres";
import { markdownToHtml, validateSlug, toStringArray, resolveOwner } from "./shared";

// Gültige Kategorien — muss exakt dem CHECK-Constraint in schema.sql sowie
// ArchiveCategory in src/types/archive.ts entsprechen.
const VALID_CATEGORIES = [
  "dialogue",
  "npc",
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
  dialoge: "dialogue",
  npc: "npc",
  npcs: "npc",
  fraktionen: "faction",
  items: "item",
  lore: "other",
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
  npc: [],
  // Dialoge zeigen Schauplatz/Datum nicht als Datenfeld, sondern im Header.
  dialogue: [],
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
  npc: [],
  // participants → Teilnehmer (NPCs als archive_links, Charaktere in Metadata).
  dialogue: [{ key: "participants", label: "Teilnehmer" }],
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

// Slug → lesbarer Name (Fallback für nicht aufgelöste Verweise/Teilnehmer).
// "atlan-da-gonozal" → "Atlan Da Gonozal".
function humanize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
  | { kind: "archive"; id: number; title: string }
  | { kind: "character"; name: string }
  | { kind: "mission"; title: string }
  | { kind: "none" };

// type (statt interface), damit das Objekt als JSONValue an sql.json() passt
// (Interfaces erhalten keine implizite Index-Signatur).
type Participant = {
  slug: string;
  name: string;
  kind: "character" | "archive" | "unknown";
};

export async function ingestArchive(
  sql: postgres.Sql,
  vaultPath: string,
  onlyNew = false,
): Promise<Set<string>> {
  const changedSlugs = new Set<string>();
  const dir = join(vaultPath, "Archiv");

  const files = collectMarkdown(dir);

  console.log(`\n📚 Archiv: ${files.length} Dateien gefunden`);

  let success = 0;
  let skipped = 0;
  let alreadyExists = 0;
  const errors: string[] = [];

  const slugToId = new Map<string, number>();
  const slugTitle = new Map<string, string>();
  const processedIds: number[] = [];
  const references: { sourceSlug: string; target: string; label: string }[] =
    [];
  // Dialog-spezifische Roh-Verweise (Teilnehmer / Schauplatz-Ort).
  const dialogueParticipants: { source: string; target: string }[] = [];
  const dialogueLocations: { source: string; target: string }[] = [];

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
      const ownerUserId = await resolveOwner(sql, fm.owner);

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
        // Dialog-spezifisch (im 2. Pass befüllt bzw. hier aus Frontmatter).
        setting: str(fm.setting),
        logDate: attrValue(fm.log_date),
        participants: [] as Participant[],
        location: null as { slug: string; title: string } | null,
      };

      // Im onlyNew-Modus wird ein bereits existierender Slug komplett
      // übersprungen (DO NOTHING liefert dann keine Zeile zurück) — er wird
      // dann auch nicht zu den unten aufgelösten Verweisen hinzugefügt,
      // bestehende Verweise/Links bleiben unangetastet.
      const conflictClause = onlyNew
        ? sql`ON CONFLICT (slug) DO NOTHING`
        : sql`ON CONFLICT (slug) DO UPDATE SET
            title         = EXCLUDED.title,
            category      = EXCLUDED.category,
            content       = EXCLUDED.content,
            tags          = EXCLUDED.tags,
            metadata      = EXCLUDED.metadata,
            source_md     = EXCLUDED.source_md,
            frontmatter   = EXCLUDED.frontmatter,
            owner_user_id = EXCLUDED.owner_user_id,
            updated_at    = NOW()`;

      // "old" wird als CTE vor der Modifikation gegen den Tabellenstand zu
      // Beginn des Statements ausgewertet (siehe missions.ts) — nur
      // title/category/content werden verglichen, nicht die volle
      // (verschachtelte) metadata, die ohnehin erst im 2. Pass unten final
      // zusammengeführt wird.
      const [row] = await sql<
        { id: number; old_title: string | null; old_category: string | null; old_content: string | null }[]
      >`
        WITH old AS (
          SELECT title, category, content FROM archive_entries WHERE slug = ${slug}
        )
        INSERT INTO archive_entries (
          slug, title, category, content, tags, metadata,
          source_md, frontmatter, owner_user_id, updated_at
        ) VALUES (
          ${slug},
          ${title},
          ${category},
          ${contentHtml},
          ${tags},
          ${sql.json(metadata)},
          ${content},
          ${sql.json(data)},
          ${ownerUserId},
          NOW()
        )
        ${conflictClause}
        RETURNING
          id,
          (SELECT title FROM old) AS old_title,
          (SELECT category FROM old) AS old_category,
          (SELECT content FROM old) AS old_content
      `;

      if (!row) {
        alreadyExists++;
        continue;
      }

      if (
        row.old_title != null &&
        (row.old_title !== title ||
          row.old_category !== category ||
          row.old_content !== contentHtml)
      ) {
        changedSlugs.add(slug);
      }

      slugToId.set(slug, row.id);
      slugTitle.set(slug, title);
      processedIds.push(row.id);

      // Referenz-Slugs einsammeln (im 2. Pass aufgelöst).
      const refSpecs = [
        ...(CATEGORY_REFERENCES[category] ?? []),
        ...COMMON_REFERENCES,
      ];
      for (const spec of refSpecs) {
        for (const target of toStringArray(fm[spec.key])) {
          const t = target.trim();
          if (t)
            references.push({ sourceSlug: slug, target: t, label: spec.label });
        }
      }

      // Dialog: Teilnehmer + verlinkter Schauplatz-Ort strukturiert ablegen.
      if (category === "dialogue") {
        for (const p of toStringArray(fm.participants)) {
          const t = p.trim();
          if (t) dialogueParticipants.push({ source: slug, target: t });
        }
        for (const l of toStringArray(fm.related_locations)) {
          const t = l.trim();
          if (t) dialogueLocations.push({ source: slug, target: t });
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
    let archiveId = slugToId.get(slug);
    let archiveTitleVal = slugTitle.get(slug);
    if (archiveId == null) {
      const [a] = await sql<{ id: number; title: string }[]>`
        SELECT id, title FROM archive_entries WHERE slug = ${slug}
      `;
      if (a) {
        archiveId = a.id;
        archiveTitleVal = a.title;
        slugToId.set(slug, a.id);
        slugTitle.set(slug, a.title);
      }
    }
    if (archiveId != null) {
      res = { kind: "archive", id: archiveId, title: archiveTitleVal ?? slug };
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

  // Dialog-Teilnehmer auflösen (Charakter → /characters, Archiv/NPC → /archive).
  // Nicht auflösbare Teilnehmer (z.B. NPC ohne eigenen Eintrag) bleiben erhalten
  // und werden als "unknown" (ohne Link) angezeigt — es sollen ALLE erscheinen.
  const participantsBySource = new Map<string, Participant[]>();
  for (const { source, target } of dialogueParticipants) {
    const resolved = await resolveRef(target);
    let p: Participant;
    if (resolved.kind === "character") {
      p = { slug: target, name: resolved.name, kind: "character" };
    } else if (resolved.kind === "archive") {
      p = { slug: target, name: resolved.title, kind: "archive" };
    } else {
      p = { slug: target, name: humanize(target), kind: "unknown" };
    }
    const arr = participantsBySource.get(source) ?? [];
    if (!arr.some((x) => x.slug === p.slug)) arr.push(p);
    participantsBySource.set(source, arr);
  }

  // Verlinkter Schauplatz-Ort (erster auflösbarer related_locations-Eintrag).
  const locationBySource = new Map<string, { slug: string; title: string }>();
  for (const { source, target } of dialogueLocations) {
    if (locationBySource.has(source)) continue;
    const resolved = await resolveRef(target);
    if (resolved.kind === "archive") {
      locationBySource.set(source, { slug: target, title: resolved.title });
    }
  }

  // Alle strukturierten Verweise pro Quell-Eintrag in die Metadata mergen.
  const sources = new Set<string>([
    ...sideRefs.keys(),
    ...participantsBySource.keys(),
    ...locationBySource.keys(),
  ]);
  for (const sourceSlug of sources) {
    const id = slugToId.get(sourceSlug);
    if (id == null) continue;

    const side = sideRefs.get(sourceSlug);
    const extra = {
      characters: side
        ? [...side.characters].map(([slug, name]) => ({ slug, name }))
        : [],
      missions: side
        ? [...side.missions].map(([slug, title]) => ({ slug, title }))
        : [],
      participants: participantsBySource.get(sourceSlug) ?? [],
      location: locationBySource.get(sourceSlug) ?? null,
    };
    await sql`
      UPDATE archive_entries
      SET metadata = metadata || ${sql.json(extra)}
      WHERE id = ${id}
    `;
  }

  console.log(
    `  → ${success} importiert, ${skipped} übersprungen, ${linkCount} Verweise` +
      (onlyNew ? `, ${alreadyExists} bereits vorhanden` : ""),
  );
  if (errors.length > 0) {
    console.error("\n  Hinweise:");
    errors.forEach((e) => console.error(e));
  }

  return changedSlugs;
}

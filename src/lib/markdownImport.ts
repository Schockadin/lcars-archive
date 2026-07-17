// Admin-Markdown-Upload (/admin/import): parst hochgeladene .md-Dateien im
// selben Frontmatter-Format wie das CLI-Ingest (scripts/ingest/*.ts, siehe
// dortige VaultPath-basierte Batch-Verarbeitung) und legt daraus neue
// Archiv-Einträge/Missionen/Charaktere an — aber einzeln statt als Batch:
// jede Datei wird zuerst nur geparst (preview*, keine Schreibaktion) und erst
// nach expliziter Bestätigung pro Datei committet (commit*).
//
// Zwei bewusste Abweichungen vom CLI-Ingest:
// - Kategorie-Ableitung aus dem Ordnernamen (FOLDER_CATEGORY) entfällt beim
//   Einzel-Upload mangels Ordnerkontext — category MUSS im Frontmatter stehen.
// - Referenzen (related_*, participants, Dialog-Schauplatz) werden pro Datei
//   gegen den AKTUELLEN DB-Stand aufgelöst statt in einem Batch-weiten
//   2-Pass wie beim CLI-Ingest (dort sehen sich alle Dateien EINES Laufs
//   gegenseitig, auch untereinander neu angelegte). Bei Einzel-Bestätigung
//   ergibt ein globaler 2-Pass keinen Sinn — wer referenzierte Einträge
//   zuerst hochlädt/bestätigt, bekommt trotzdem vollständige Verlinkung.
//   Unauflösbare Verweise brechen den Import nicht ab (wie beim CLI-Ingest),
//   sondern werden als Warnung zurückgegeben.
//
// Anders als das CLI-Ingest (Upsert bei existierendem Slug) lehnt der Commit
// einen bereits vergebenen Slug hart ab — ein versehentliches Überschreiben
// bestehender Inhalte über eine Web-Upload-Fläche (ohne git-Review wie beim
// Vault-Ingest) ist ein deutlich größeres Risiko als beim CLI-Tool.
import "server-only";
import matter from "gray-matter";
import type postgres from "postgres";
import sql from "@/lib/db";
import { markdownToHtml } from "@/lib/markdown";
import {
  validateSlug,
  parseDate,
  toStringArray,
  toNumberArray,
  resolveOwner,
} from "@/lib/ingestShared";
import {
  VALID_CATEGORIES,
  COMMON_ATTRIBUTES,
  CATEGORY_ATTRIBUTES,
  COMMON_REFERENCES,
  CATEGORY_REFERENCES,
  attrValue,
  humanize,
  str,
} from "@/lib/archiveFrontmatterFields";
import type { ArchiveMetadata, ArchiveParticipant } from "@/types/archive";

type SqlClient = postgres.ISql;

export interface ImportFailure {
  ok: false;
  filename: string;
  error: string;
}

export interface CommitFailure {
  ok: false;
  error: string;
}

export interface CommitSuccess {
  ok: true;
  slug: string;
  id: number;
  warnings: string[];
}

export type CommitResult = CommitSuccess | CommitFailure;

// ── Archiv-Einträge ─────────────────────────────────────────────────────

export interface ArchiveImportPreview {
  kind: "archive";
  ok: true;
  filename: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  summary: string | null;
  contentHtml: string;
  attributes: { label: string; value: string }[];
  referenceTargets: { label: string; target: string }[];
  ownerSlug: string | null;
  slugTaken: boolean;
  warnings: string[];
}

export type ArchivePreviewResult = ArchiveImportPreview | ImportFailure;

interface ParsedArchiveFrontmatter {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  contentHtml: string;
  content: string;
  data: Record<string, unknown>;
  attributes: { label: string; value: string }[];
  referenceTargets: { label: string; target: string }[];
  dialogueParticipantTargets: string[];
  dialogueLocationTargets: string[];
}

async function parseArchiveFrontmatter(
  filename: string,
  raw: string,
): Promise<ParsedArchiveFrontmatter> {
  const { data, content } = matter(raw);
  const fm = data as Record<string, unknown>;

  if (str(fm.type) !== "archive") {
    throw new Error('Frontmatter "type: archive" fehlt.');
  }

  const slug = validateSlug(fm.slug, filename);
  const title = str(fm.title);
  if (!title) throw new Error('Pflichtfeld "title" fehlt oder ist leer.');

  const category = str(fm.category);
  if (!category || !VALID_CATEGORIES.includes(category)) {
    throw new Error(
      `Kategorie fehlt oder ungültig (category="${category ?? ""}") — beim Datei-Upload gibt es keinen Ordnerkontext zum Ableiten, bitte category im Frontmatter angeben.`,
    );
  }

  const contentHtml = await markdownToHtml(content);
  const tags = toStringArray(fm.tags);

  const attrSpecs = [...COMMON_ATTRIBUTES, ...(CATEGORY_ATTRIBUTES[category] ?? [])];
  const attributes = attrSpecs
    .map((spec) => ({ label: spec.label, value: attrValue(fm[spec.key]) }))
    .filter((a): a is { label: string; value: string } => a.value != null);

  const refSpecs = [...(CATEGORY_REFERENCES[category] ?? []), ...COMMON_REFERENCES];
  const referenceTargets: { label: string; target: string }[] = [];
  for (const spec of refSpecs) {
    for (const target of toStringArray(fm[spec.key])) {
      const t = target.trim();
      if (t) referenceTargets.push({ label: spec.label, target: t });
    }
  }

  const dialogueParticipantTargets =
    category === "dialogue"
      ? toStringArray(fm.participants).map((t) => t.trim()).filter(Boolean)
      : [];
  const dialogueLocationTargets =
    category === "dialogue"
      ? toStringArray(fm.related_locations).map((t) => t.trim()).filter(Boolean)
      : [];

  return {
    slug,
    title,
    category,
    tags,
    contentHtml,
    content,
    data: fm,
    attributes,
    referenceTargets,
    dialogueParticipantTargets,
    dialogueLocationTargets,
  };
}

export async function previewArchiveMarkdown(
  filename: string,
  raw: string,
): Promise<ArchivePreviewResult> {
  try {
    const parsed = await parseArchiveFrontmatter(filename, raw);
    const [existing] = await sql<{ id: number }[]>`
      SELECT id FROM archive_entries WHERE slug = ${parsed.slug}
    `;
    const data = parsed.data;
    return {
      kind: "archive",
      ok: true,
      filename,
      slug: parsed.slug,
      title: parsed.title,
      category: parsed.category,
      tags: parsed.tags,
      summary: str(data.teaser),
      contentHtml: parsed.contentHtml,
      attributes: parsed.attributes,
      referenceTargets: parsed.referenceTargets,
      ownerSlug: typeof data.owner === "string" ? data.owner.trim() || null : null,
      slugTaken: !!existing,
      warnings: existing ? [`Slug "${parsed.slug}" ist bereits vergeben.`] : [],
    };
  } catch (error) {
    return { ok: false, filename, error: error instanceof Error ? error.message : String(error) };
  }
}

type ResolvedRef =
  | { kind: "archive"; id: number; title: string }
  | { kind: "character"; name: string }
  | { kind: "mission"; title: string }
  | { kind: "none" };

async function resolveArchiveRef(client: SqlClient, slug: string): Promise<ResolvedRef> {
  const [a] = await client<{ id: number; title: string }[]>`
    SELECT id, title FROM archive_entries WHERE slug = ${slug}
  `;
  if (a) return { kind: "archive", id: a.id, title: a.title };
  const [c] = await client<{ name: string }[]>`SELECT name FROM characters WHERE slug = ${slug}`;
  if (c) return { kind: "character", name: c.name };
  const [m] = await client<{ title: string }[]>`SELECT title FROM missions WHERE slug = ${slug}`;
  if (m) return { kind: "mission", title: m.title };
  return { kind: "none" };
}

export async function commitArchiveMarkdown(
  filename: string,
  raw: string,
): Promise<CommitResult> {
  let parsed: ParsedArchiveFrontmatter;
  try {
    parsed = await parseArchiveFrontmatter(filename, raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return sql.begin(async (tx) => {
    const ownerUserId = await resolveOwner(tx, parsed.data.owner);

    const metadata: ArchiveMetadata = {
      summary: str(parsed.data.teaser),
      attributes: parsed.attributes,
      characters: [],
      missions: [],
      setting: str(parsed.data.setting),
      logDate: attrValue(parsed.data.log_date),
      participants: [],
      location: null,
    };

    const [row] = await tx<{ id: number }[]>`
      INSERT INTO archive_entries (
        slug, title, category, content, tags, metadata,
        source_md, frontmatter, owner_user_id, updated_at
      ) VALUES (
        ${parsed.slug}, ${parsed.title}, ${parsed.category}, ${parsed.contentHtml}, ${parsed.tags},
        ${tx.json(metadata as unknown as ReturnType<typeof JSON.parse>)}, ${parsed.content},
        ${tx.json(parsed.data as ReturnType<typeof JSON.parse>)}, ${ownerUserId}, NOW()
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (!row) {
      return { ok: false, error: `Slug "${parsed.slug}" ist bereits vergeben.` };
    }

    const warnings: string[] = [];
    const sideCharacters = new Map<string, string>();
    const sideMissions = new Map<string, string>();

    for (const ref of parsed.referenceTargets) {
      const resolved = await resolveArchiveRef(tx, ref.target);
      if (resolved.kind === "archive") {
        if (resolved.id === row.id) continue; // Selbstverweis überspringen
        await tx`
          INSERT INTO archive_links (source_id, target_id, label)
          VALUES (${row.id}, ${resolved.id}, ${ref.label})
          ON CONFLICT (source_id, target_id) DO UPDATE SET label = EXCLUDED.label
        `;
      } else if (resolved.kind === "character") {
        sideCharacters.set(ref.target, resolved.name);
      } else if (resolved.kind === "mission") {
        sideMissions.set(ref.target, resolved.title);
      } else {
        warnings.push(`Verweis "${ref.target}" (${ref.label}) nicht gefunden, wurde ignoriert.`);
      }
    }

    const participants: ArchiveParticipant[] = [];
    for (const target of parsed.dialogueParticipantTargets) {
      const resolved = await resolveArchiveRef(tx, target);
      if (resolved.kind === "character") {
        participants.push({ slug: target, name: resolved.name, kind: "character" });
      } else if (resolved.kind === "archive") {
        participants.push({ slug: target, name: resolved.title, kind: "archive" });
      } else {
        participants.push({ slug: target, name: humanize(target), kind: "unknown" });
      }
    }

    let location: { slug: string; title: string } | null = null;
    for (const target of parsed.dialogueLocationTargets) {
      const resolved = await resolveArchiveRef(tx, target);
      if (resolved.kind === "archive") {
        location = { slug: target, title: resolved.title };
        break;
      }
    }

    if (sideCharacters.size || sideMissions.size || participants.length || location) {
      const extra = {
        characters: [...sideCharacters].map(([slug, name]) => ({ slug, name })),
        missions: [...sideMissions].map(([slug, title]) => ({ slug, title })),
        participants,
        location,
      };
      await tx`
        UPDATE archive_entries SET metadata = metadata || ${tx.json(extra as ReturnType<typeof JSON.parse>)} WHERE id = ${row.id}
      `;
    }

    return { ok: true, slug: parsed.slug, id: row.id, warnings };
  });
}

// ── Missionen ────────────────────────────────────────────────────────────

const MISSION_STATUSES = ["active", "completed", "failed", "abandoned"];

export interface MissionImportPreview {
  kind: "mission";
  ok: true;
  filename: string;
  slug: string;
  title: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  bodyHtml: string;
  ownerSlug: string | null;
  slugTaken: boolean;
  warnings: string[];
}

export type MissionPreviewResult = MissionImportPreview | ImportFailure;

interface ParsedMissionFrontmatter {
  slug: string;
  title: string;
  status: string;
  content: string;
  data: Record<string, unknown>;
  bodyHtml: string;
}

async function parseMissionFrontmatter(
  filename: string,
  raw: string,
): Promise<ParsedMissionFrontmatter> {
  const { data, content } = matter(raw);
  const fm = data as Record<string, unknown>;

  if (str(fm.type) !== "mission") {
    throw new Error('Frontmatter "type: mission" fehlt.');
  }
  const slug = validateSlug(fm.slug, filename);
  const title = str(fm.title);
  if (!title) throw new Error('Pflichtfeld "title" fehlt oder ist leer.');
  const status = str(fm.status) ?? "active";
  if (!MISSION_STATUSES.includes(status)) {
    throw new Error(`Ungültiger status "${status}" – erlaubt: ${MISSION_STATUSES.join(", ")}`);
  }
  const bodyHtml = await markdownToHtml(content);

  return { slug, title, status, content, data: fm, bodyHtml };
}

export async function previewMissionMarkdown(
  filename: string,
  raw: string,
): Promise<MissionPreviewResult> {
  try {
    const parsed = await parseMissionFrontmatter(filename, raw);
    const [existing] = await sql<{ id: number }[]>`SELECT id FROM missions WHERE slug = ${parsed.slug}`;
    return {
      kind: "mission",
      ok: true,
      filename,
      slug: parsed.slug,
      title: parsed.title,
      status: parsed.status,
      startedAt: parseDate(parsed.data.started_at),
      endedAt: parseDate(parsed.data.ended_at),
      tags: toStringArray(parsed.data.tags),
      bodyHtml: parsed.bodyHtml,
      ownerSlug: typeof parsed.data.owner === "string" ? parsed.data.owner.trim() || null : null,
      slugTaken: !!existing,
      warnings: existing ? [`Slug "${parsed.slug}" ist bereits vergeben.`] : [],
    };
  } catch (error) {
    return { ok: false, filename, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function commitMissionMarkdown(
  filename: string,
  raw: string,
): Promise<CommitResult> {
  let parsed: ParsedMissionFrontmatter;
  try {
    parsed = await parseMissionFrontmatter(filename, raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const metadata = { tags: toStringArray(parsed.data.tags), body: parsed.bodyHtml };

  return sql.begin(async (tx) => {
    const ownerUserId = await resolveOwner(tx, parsed.data.owner);
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO missions (
        slug, title, status, started_at, ended_at, metadata,
        source_md, frontmatter, owner_user_id, updated_at
      ) VALUES (
        ${parsed.slug}, ${parsed.title}, ${parsed.status},
        ${parseDate(parsed.data.started_at)}, ${parseDate(parsed.data.ended_at)},
        ${tx.json(metadata as ReturnType<typeof JSON.parse>)}, ${parsed.content},
        ${tx.json(parsed.data as ReturnType<typeof JSON.parse>)}, ${ownerUserId}, NOW()
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (!row) {
      return { ok: false, error: `Slug "${parsed.slug}" ist bereits vergeben.` };
    }
    return { ok: true, slug: parsed.slug, id: row.id, warnings: [] };
  });
}

// ── Charaktere ───────────────────────────────────────────────────────────

const CHARACTER_STATUSES = ["active", "retired", "deceased"];

export interface CharacterImportPreview {
  kind: "character";
  ok: true;
  filename: string;
  slug: string;
  name: string;
  status: string;
  bio: string;
  slugTaken: boolean;
  warnings: string[];
}

export type CharacterPreviewResult = CharacterImportPreview | ImportFailure;

interface ParsedCharacterFrontmatter {
  slug: string;
  name: string;
  status: string;
  content: string;
  data: Record<string, unknown>;
  bio: string;
}

async function parseCharacterFrontmatter(
  filename: string,
  raw: string,
): Promise<ParsedCharacterFrontmatter> {
  const { data, content } = matter(raw);
  const fm = data as Record<string, unknown>;

  if (str(fm.type) !== "character") {
    throw new Error('Frontmatter "type: character" fehlt.');
  }
  const slug = validateSlug(fm.slug, filename);
  const name = str(fm.name);
  if (!name) throw new Error('Pflichtfeld "name" fehlt oder ist leer.');
  const status = str(fm.status) ?? "active";
  if (!CHARACTER_STATUSES.includes(status)) {
    throw new Error(`Ungültiger status "${status}" – erlaubt: ${CHARACTER_STATUSES.join(", ")}`);
  }
  const bio = await markdownToHtml(content);

  return { slug, name, status, content, data: fm, bio };
}

export async function previewCharacterMarkdown(
  filename: string,
  raw: string,
): Promise<CharacterPreviewResult> {
  try {
    const parsed = await parseCharacterFrontmatter(filename, raw);
    const [existing] = await sql<{ id: number }[]>`SELECT id FROM characters WHERE slug = ${parsed.slug}`;
    return {
      kind: "character",
      ok: true,
      filename,
      slug: parsed.slug,
      name: parsed.name,
      status: parsed.status,
      bio: parsed.bio,
      slugTaken: !!existing,
      warnings: existing ? [`Slug "${parsed.slug}" ist bereits vergeben.`] : [],
    };
  } catch (error) {
    return { ok: false, filename, error: error instanceof Error ? error.message : String(error) };
  }
}

interface CharacterAffiliation {
  factions?: string | string[];
  ships?: string | string[];
  division?: string;
}

export async function commitCharacterMarkdown(
  filename: string,
  raw: string,
): Promise<CommitResult> {
  let parsed: ParsedCharacterFrontmatter;
  try {
    parsed = await parseCharacterFrontmatter(filename, raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const fm = parsed.data;
  const affiliation = fm.affiliation as CharacterAffiliation | undefined;
  const metadata = {
    rank: str(fm.rank),
    species: toStringArray(fm.species),
    homeworld: str(fm.homeworld),
    age: typeof fm.age === "number" ? fm.age : null,
    affiliation: affiliation
      ? {
          factions: toStringArray(affiliation.factions),
          ships: toStringArray(affiliation.ships),
          division: str(affiliation.division ?? null),
        }
      : null,
    player: str(fm.player),
    tags: toStringArray(fm.tags),
    aliases: toStringArray(fm.aliases),
    generation: toNumberArray(fm.generation),
  };

  const [row] = await sql<{ id: number }[]>`
    INSERT INTO characters (
      slug, name, status, portrait, bio, metadata,
      source_md, frontmatter, updated_at
    ) VALUES (
      ${parsed.slug}, ${parsed.name}, ${parsed.status}, ${str(fm.portrait)}, ${parsed.bio},
      ${sql.json(metadata as ReturnType<typeof JSON.parse>)}, ${parsed.content},
      ${sql.json(fm as ReturnType<typeof JSON.parse>)}, NOW()
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `;
  if (!row) {
    return { ok: false, error: `Slug "${parsed.slug}" ist bereits vergeben.` };
  }
  return { ok: true, slug: parsed.slug, id: row.id, warnings: [] };
}

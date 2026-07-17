// Admin-Markdown-Upload (/admin/import): parst hochgeladene .md-Dateien im
// selben Frontmatter-Format wie das CLI-Ingest (scripts/ingest/*.ts, siehe
// dortige VaultPath-basierte Batch-Verarbeitung) und legt daraus neue
// Archiv-Einträge/Missionen/Charaktere/Missionslogs an — aber einzeln statt
// als Batch: jede Datei wird zuerst nur geparst (preview*, keine
// Schreibaktion) und kann vor dem Anlegen in der UI bearbeitet werden
// (siehe *Edits-Interfaces unten), bevor sie einzeln bestätigt wird
// (commit*).
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
//
// commit* nimmt zusätzlich zur rohen Datei ein *Edits-Objekt mit genau den
// Feldern entgegen, die die Vorschau in der UI auch anzeigt (Titel/Tags/
// Slug/Body-Text etc., siehe MarkdownImportPanel.tsx) — diese Werte
// gewinnen gegenüber dem geparsten Frontmatter. Alles, was die Vorschau
// NICHT anzeigt (Attribute/Referenzen bei Archiv-Einträgen, das restliche
// Charakter-Metadata), bleibt unverändert aus dem geparsten Frontmatter.
// Kein Sicherheitsproblem, da beide Actions bereits requireAdmin() prüfen —
// derselbe Vertrauensrahmen wie jedes andere Inhalts-Erstellformular, das
// ebenfalls beliebige Freitext-Werte einer eingeloggten Person entgegennimmt.
import "server-only";
import matter from "gray-matter";
import type postgres from "postgres";
import sql from "@/lib/db";
import { markdownToHtml } from "@/lib/markdown";
import { createMissionLog, missionLogSlugExists } from "@/lib/missions";
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

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

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
  bodyMarkdown: string;
  attributes: { label: string; value: string }[];
  referenceTargets: { label: string; target: string }[];
  ownerSlug: string | null;
  slugTaken: boolean;
  warnings: string[];
}

export type ArchivePreviewResult = ArchiveImportPreview | ImportFailure;

// Editierbare Teilmenge der Vorschau (siehe Datei-Kopfkommentar) — category
// bleibt bewusst NICHT editierbar: attributes/referenceTargets wurden schon
// beim Parsen gegen die ursprüngliche category aufgelöst (siehe
// CATEGORY_ATTRIBUTES/CATEGORY_REFERENCES), ein nachträglicher
// Kategoriewechsel würde sie inkonsistent machen.
export interface ArchiveImportEdits {
  slug: string;
  title: string;
  tags: string[];
  summary: string | null;
  bodyMarkdown: string;
}

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
      bodyMarkdown: parsed.content,
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
  edits: ArchiveImportEdits,
): Promise<CommitResult> {
  let parsed: ParsedArchiveFrontmatter;
  try {
    parsed = await parseArchiveFrontmatter(filename, raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  let slug: string;
  try {
    slug = validateSlug(edits.slug, filename);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const title = edits.title.trim();
  if (!title) return { ok: false, error: 'Pflichtfeld "Titel" darf nicht leer sein.' };
  const contentHtml = await markdownToHtml(edits.bodyMarkdown);

  return sql.begin(async (tx) => {
    const ownerUserId = await resolveOwner(tx, parsed.data.owner);

    const metadata: ArchiveMetadata = {
      summary: edits.summary,
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
        ${slug}, ${title}, ${parsed.category}, ${contentHtml}, ${edits.tags},
        ${tx.json(metadata as unknown as ReturnType<typeof JSON.parse>)}, ${edits.bodyMarkdown},
        ${tx.json(parsed.data as ReturnType<typeof JSON.parse>)}, ${ownerUserId}, NOW()
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (!row) {
      return { ok: false, error: `Slug "${slug}" ist bereits vergeben.` };
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

    return { ok: true, slug, id: row.id, warnings };
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
  bodyMarkdown: string;
  ownerSlug: string | null;
  slugTaken: boolean;
  warnings: string[];
}

export type MissionPreviewResult = MissionImportPreview | ImportFailure;

export interface MissionImportEdits {
  slug: string;
  title: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  bodyMarkdown: string;
}

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
      bodyMarkdown: parsed.content,
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
  edits: MissionImportEdits,
): Promise<CommitResult> {
  let parsed: ParsedMissionFrontmatter;
  try {
    parsed = await parseMissionFrontmatter(filename, raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  let slug: string;
  try {
    slug = validateSlug(edits.slug, filename);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const title = edits.title.trim();
  if (!title) return { ok: false, error: 'Pflichtfeld "Titel" darf nicht leer sein.' };
  if (!MISSION_STATUSES.includes(edits.status)) {
    return {
      ok: false,
      error: `Ungültiger status "${edits.status}" – erlaubt: ${MISSION_STATUSES.join(", ")}`,
    };
  }
  const bodyHtml = await markdownToHtml(edits.bodyMarkdown);
  const metadata = { tags: edits.tags, body: bodyHtml };

  return sql.begin(async (tx) => {
    const ownerUserId = await resolveOwner(tx, parsed.data.owner);
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO missions (
        slug, title, status, started_at, ended_at, metadata,
        source_md, frontmatter, owner_user_id, updated_at
      ) VALUES (
        ${slug}, ${title}, ${edits.status},
        ${edits.startedAt}, ${edits.endedAt},
        ${tx.json(metadata as ReturnType<typeof JSON.parse>)}, ${edits.bodyMarkdown},
        ${tx.json(parsed.data as ReturnType<typeof JSON.parse>)}, ${ownerUserId}, NOW()
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (!row) {
      return { ok: false, error: `Slug "${slug}" ist bereits vergeben.` };
    }
    return { ok: true, slug, id: row.id, warnings: [] };
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
  bodyMarkdown: string;
  slugTaken: boolean;
  warnings: string[];
}

export type CharacterPreviewResult = CharacterImportPreview | ImportFailure;

export interface CharacterImportEdits {
  slug: string;
  name: string;
  status: string;
  bodyMarkdown: string;
}

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
      bodyMarkdown: parsed.content,
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
  edits: CharacterImportEdits,
): Promise<CommitResult> {
  let parsed: ParsedCharacterFrontmatter;
  try {
    parsed = await parseCharacterFrontmatter(filename, raw);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  let slug: string;
  try {
    slug = validateSlug(edits.slug, filename);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const name = edits.name.trim();
  if (!name) return { ok: false, error: 'Pflichtfeld "Name" darf nicht leer sein.' };
  if (!CHARACTER_STATUSES.includes(edits.status)) {
    return {
      ok: false,
      error: `Ungültiger status "${edits.status}" – erlaubt: ${CHARACTER_STATUSES.join(", ")}`,
    };
  }
  const bio = await markdownToHtml(edits.bodyMarkdown);

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
      ${slug}, ${name}, ${edits.status}, ${str(fm.portrait)}, ${bio},
      ${sql.json(metadata as ReturnType<typeof JSON.parse>)}, ${edits.bodyMarkdown},
      ${sql.json(fm as ReturnType<typeof JSON.parse>)}, NOW()
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `;
  if (!row) {
    return { ok: false, error: `Slug "${slug}" ist bereits vergeben.` };
  }
  return { ok: true, slug, id: row.id, warnings: [] };
}

// ── Missionslogs ─────────────────────────────────────────────────────────
//
// Anders als die drei Typen oben gibt es hier keinen "reinen Parse dann
// Commit"-Pfad ohne Edits: mission_id/author_id sind NOT NULL-Fremdschlüssel
// (siehe scripts/schema.sql), die sich aus Slugs im Frontmatter oft nicht
// zuverlässig auflösen lassen (Tippfehler, Datei isoliert hochgeladen ohne
// Kontext). previewMissionLogMarkdown bricht deshalb bei unauflösbarer
// Mission/Autor NICHT ab (anders als scripts/ingest/missionLogs.ts) —
// stattdessen bleiben missionTitle/authorName null, die UI zeigt zwei leere
// Auswahlfelder, und commitMissionLogMarkdown verlangt zwingend gültige
// edits.missionSlug/authorSlug. Der Slug wird wie beim CLI-Ingest aus
// author-mission-session_nr gebaut, nicht aus dem Frontmatter übernommen.

const MISSION_LOG_TYPE_MARKER = "mission-log";

export interface MissionLogImportPreview {
  kind: "mission_log";
  ok: true;
  filename: string;
  title: string;
  logDate: string | null;
  sessionNr: number | null;
  tags: string[];
  bodyHtml: string;
  bodyMarkdown: string;
  missionSlug: string;
  missionTitle: string | null;
  authorSlug: string;
  authorName: string | null;
  ownerSlug: string | null;
  warnings: string[];
}

export type MissionLogPreviewResult = MissionLogImportPreview | ImportFailure;

export interface MissionLogImportEdits {
  title: string;
  missionSlug: string;
  authorSlug: string;
  logDate: string | null;
  sessionNr: number;
  tags: string[];
  bodyMarkdown: string;
  ownerSlug: string | null;
}

interface ParsedMissionLogFrontmatter {
  title: string;
  content: string;
  bodyHtml: string;
  data: Record<string, unknown>;
  missionSlug: string;
  authorSlug: string;
  sessionNr: number | null;
  logDate: string | null;
  tags: string[];
}

function toOptionalInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

async function parseMissionLogFrontmatter(
  filename: string,
  raw: string,
): Promise<ParsedMissionLogFrontmatter> {
  const { data, content } = matter(raw);
  const fm = data as Record<string, unknown>;

  if (str(fm.type) !== MISSION_LOG_TYPE_MARKER) {
    throw new Error('Frontmatter "type: mission-log" fehlt.');
  }
  const title = str(fm.title);
  if (!title) throw new Error('Pflichtfeld "title" fehlt oder ist leer.');
  const bodyHtml = await markdownToHtml(content);

  return {
    title,
    content,
    bodyHtml,
    data: fm,
    missionSlug: typeof fm.mission === "string" ? fm.mission.trim() : "",
    authorSlug: typeof fm.author === "string" ? fm.author.trim() : "",
    sessionNr: toOptionalInt(fm.session_nr),
    logDate: parseDate(fm.log_date),
    tags: toStringArray(fm.tags),
  };
}

export async function previewMissionLogMarkdown(
  filename: string,
  raw: string,
): Promise<MissionLogPreviewResult> {
  try {
    const parsed = await parseMissionLogFrontmatter(filename, raw);
    const warnings: string[] = [];

    let missionTitle: string | null = null;
    if (parsed.missionSlug) {
      const [m] = await sql<{ title: string }[]>`
        SELECT title FROM missions WHERE slug = ${parsed.missionSlug}
      `;
      missionTitle = m?.title ?? null;
      if (!m) {
        warnings.push(`Mission "${parsed.missionSlug}" nicht gefunden — bitte manuell auswählen.`);
      }
    } else {
      warnings.push("Keine Mission im Frontmatter angegeben — bitte auswählen.");
    }

    let authorName: string | null = null;
    if (parsed.authorSlug) {
      const [c] = await sql<{ name: string }[]>`
        SELECT name FROM characters WHERE slug = ${parsed.authorSlug}
      `;
      authorName = c?.name ?? null;
      if (!c) {
        warnings.push(`Charakter "${parsed.authorSlug}" nicht gefunden — bitte manuell auswählen.`);
      }
    } else {
      warnings.push("Kein Autor im Frontmatter angegeben — bitte auswählen.");
    }

    return {
      kind: "mission_log",
      ok: true,
      filename,
      title: parsed.title,
      logDate: parsed.logDate,
      sessionNr: parsed.sessionNr,
      tags: parsed.tags,
      bodyHtml: parsed.bodyHtml,
      bodyMarkdown: parsed.content,
      missionSlug: parsed.missionSlug,
      missionTitle,
      authorSlug: parsed.authorSlug,
      authorName,
      ownerSlug: typeof parsed.data.owner === "string" ? parsed.data.owner.trim() || null : null,
      warnings,
    };
  } catch (error) {
    return { ok: false, filename, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function commitMissionLogMarkdown(
  filename: string,
  _raw: string,
  edits: MissionLogImportEdits,
): Promise<CommitResult> {
  const title = edits.title.trim();
  if (!title) return { ok: false, error: 'Pflichtfeld "Titel" darf nicht leer sein.' };
  if (!Number.isInteger(edits.sessionNr) || edits.sessionNr < 1) {
    return { ok: false, error: "Sitzungsnummer muss eine positive ganze Zahl sein." };
  }

  const [mission] = await sql<{ id: number; slug: string }[]>`
    SELECT id, slug FROM missions WHERE slug = ${edits.missionSlug}
  `;
  if (!mission) return { ok: false, error: `Mission "${edits.missionSlug}" nicht gefunden.` };

  const [author] = await sql<{ id: number; slug: string; player_id: number | null }[]>`
    SELECT id, slug, player_id FROM characters WHERE slug = ${edits.authorSlug}
  `;
  if (!author) return { ok: false, error: `Charakter "${edits.authorSlug}" nicht gefunden.` };

  let slug: string;
  try {
    slug = validateSlug(`${author.slug}-${mission.slug}-${edits.sessionNr}`, filename);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (await missionLogSlugExists(slug)) {
    return { ok: false, error: `Slug "${slug}" ist bereits vergeben.` };
  }

  const ownerUserId = edits.ownerSlug
    ? await resolveOwner(sql, edits.ownerSlug)
    : author.player_id;

  try {
    const { id } = await createMissionLog({
      slug,
      missionId: mission.id,
      authorId: author.id,
      title,
      bodyMarkdown: edits.bodyMarkdown,
      logDate: edits.logDate,
      sessionNr: edits.sessionNr,
      tags: edits.tags,
      ownerUserId,
    });
    return { ok: true, slug, id, warnings: [] };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: `Slug "${slug}" ist bereits vergeben.` };
    }
    throw error;
  }
}

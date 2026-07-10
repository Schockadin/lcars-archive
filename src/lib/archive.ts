import { unstable_cache } from "next/cache";
import sql from "@/lib/db";
import { cacheTags } from "@/lib/cacheTags";
import { renderContentHtml } from "@/lib/autolink";
import { slugifyBase } from "@/lib/slug";
import {
  getAttributeFields,
  getReferenceFields,
  OWN_TABLE_REFERENCE_KEYS,
} from "@/lib/archiveMetadataFields";
import {
  ArchiveCategory,
  ArchiveCharacterRef,
  ArchiveEntryDetail,
  ArchiveEntryPreview,
  ArchiveLink,
  ArchiveMetadata,
  ArchiveMissionRef,
  ArchiveAttribute,
  ArchivePath,
} from "@/types/archive";

// Baut metadata.attributes aus den Formularwerten der "Metadaten +/-"-Sektion
// — nur Felder, die für die jeweilige Kategorie vorgesehen sind (siehe
// getAttributeFields), nur nicht-leere Werte.
function buildArchiveAttributes(
  category: ArchiveCategory,
  attributeValues: Record<string, string>,
): ArchiveAttribute[] {
  return getAttributeFields(category)
    .map((field) => ({ label: field.label, value: (attributeValues[field.key] ?? "").trim() }))
    .filter((attr): attr is ArchiveAttribute => attr.value !== "");
}

function parseSlugList(csv: string): string[] {
  return [
    ...new Set(
      csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

// Löst die "Metadaten +/-"-Verweisfelder (related_missions/related_characters
// + kategorie-spezifische Verweise wie leader/headquarters/participants) auf
// und schreibt sie: related_missions/related_characters → metadata.missions/
// characters (eigene Tabellen), alle anderen → archive_links mit dem
// jeweiligen FieldSpec-Label. Ersetzt bestehende Links des Eintrags komplett
// (DELETE + INSERT), analog zum 2-Pass-Ingest (scripts/ingest/archive.ts).
async function saveArchiveReferences(
  entryId: number,
  ownSlug: string,
  category: ArchiveCategory,
  referenceValues: Record<string, string>,
): Promise<{ missions: ArchiveMissionRef[]; characters: ArchiveCharacterRef[] }> {
  let missions: ArchiveMissionRef[] = [];
  let characters: ArchiveCharacterRef[] = [];
  const linkTargets: { targetId: number; label: string }[] = [];

  for (const field of getReferenceFields(category)) {
    const slugs = parseSlugList(referenceValues[field.key] ?? "").filter(
      (s) => s !== ownSlug,
    );
    if (slugs.length === 0) continue;

    if (field.key === "related_missions") {
      const rows = await sql<ArchiveMissionRef[]>`
        SELECT slug, title FROM missions WHERE slug = ANY(${slugs})
      `;
      missions = rows;
    } else if (field.key === "related_characters") {
      const rows = await sql<ArchiveCharacterRef[]>`
        SELECT slug, name FROM characters WHERE slug = ANY(${slugs})
      `;
      characters = rows;
    } else if (!OWN_TABLE_REFERENCE_KEYS.has(field.key)) {
      const rows = await sql<{ id: number }[]>`
        SELECT id FROM archive_entries WHERE slug = ANY(${slugs})
      `;
      for (const row of rows) {
        linkTargets.push({ targetId: row.id, label: field.label });
      }
    }
  }

  await sql`DELETE FROM archive_links WHERE source_id = ${entryId}`;
  if (linkTargets.length > 0) {
    // Ein Ziel kann über mehrere Felder mehrfach vorkommen (z.B. derselbe
    // NPC-Slug sowohl unter related_npcs als auch unter "leader") —
    // archive_links hat PRIMARY KEY (source_id, target_id), also pro
    // (source,target) nur eine Zeile; letztes Label gewinnt.
    const uniqueTargets = new Map<number, string>();
    for (const { targetId, label } of linkTargets) uniqueTargets.set(targetId, label);
    const rows = Array.from(uniqueTargets, ([targetId, label]) => ({
      source_id: entryId,
      target_id: targetId,
      label,
    }));
    await sql`
      INSERT INTO archive_links ${sql(rows, "source_id", "target_id", "label")}
    `;
  }

  return { missions, characters };
}

// metadata kommt je nach Treiber als JSONB-Objekt oder String — defensiv
// parsen UND auf die vollständige Form normalisieren, damit auch ältere
// Einträge (vor neuen Feldern importiert) eine konsistente Shape haben.
function parseMeta<T extends { metadata: ArchiveMetadata }>(row: T): T {
  const raw: Partial<ArchiveMetadata> =
    typeof row.metadata === "string"
      ? (JSON.parse(row.metadata) as Partial<ArchiveMetadata>)
      : (row.metadata ?? {});

  return {
    ...row,
    metadata: {
      summary: raw.summary ?? null,
      attributes: raw.attributes ?? [],
      characters: raw.characters ?? [],
      missions: raw.missions ?? [],
      setting: raw.setting ?? null,
      logDate: raw.logDate ?? null,
      participants: raw.participants ?? [],
      location: raw.location ?? null,
    },
  };
}

// Alle Archiv-Einträge für die Übersicht (ohne content). Alphabetisch nach
// Titel; die Gruppierung nach Kategorie übernimmt die Darstellung.
// Nur public-Einträge — diese Liste speist Übersicht/Nav/Sitemap und ist
// nicht nach Betrachter personalisierbar (unstable_cache, kein Session-
// Zugriff). private/gm-Einträge sind trotzdem über ihre Detailseite
// erreichbar (Laufzeit-Guard dort, siehe getArchiveEntryBySlug-Aufrufer).
export const getAllArchiveEntries = unstable_cache(
  async (): Promise<ArchiveEntryPreview[]> => {
    const rows = await sql<ArchiveEntryPreview[]>`
      SELECT
        id,
        slug,
        title,
        category,
        tags,
        metadata
      FROM archive_entries
      WHERE NOT (category = 'dialogue' AND dialogue_open)
        AND visibility = 'public'
      ORDER BY title ASC
    `;
    return rows.map(parseMeta);
  },
  // Key-Version "4": nur noch public-Einträge — Bump verwirft alte
  // Cache-Einträge deterministisch (auch poisoned-empty).
  ["getAllArchiveEntries", "v4"],
  { tags: [cacheTags.archive] },
);

// Ein Archiv-Eintrag per Slug inkl. aufgelöster Verweise (ein-/ausgehend).
export async function getArchiveEntryBySlug(
  slug: string,
): Promise<ArchiveEntryDetail | null> {
  return unstable_cache(
    async (): Promise<ArchiveEntryDetail | null> => {
      const rows = await sql<Omit<ArchiveEntryDetail, "links" | "backlinks">[]>`
        SELECT
          id,
          slug,
          title,
          category,
          content,
          tags,
          metadata,
          dialogue_open,
          visibility,
          owner_user_id AS "ownerUserId",
          updated_at::text AS updated_at,
          COALESCE(source_md, '') AS "sourceMarkdown"
        FROM archive_entries
        WHERE slug = ${slug}
        LIMIT 1
      `;
      const entry = rows[0];
      if (!entry) return null;

      // Ausgehende Verweise (dieser Eintrag → Ziel).
      const links = await sql<ArchiveLink[]>`
        SELECT
          e.slug,
          e.title,
          e.category,
          al.label
        FROM archive_links al
        JOIN archive_entries e ON e.id = al.target_id
        WHERE al.source_id = ${entry.id}
        ORDER BY e.title ASC
      `;

      // Eingehende Verweise (Quelle → dieser Eintrag).
      const backlinks = await sql<ArchiveLink[]>`
        SELECT
          e.slug,
          e.title,
          e.category,
          al.label
        FROM archive_links al
        JOIN archive_entries e ON e.id = al.source_id
        WHERE al.target_id = ${entry.id}
        ORDER BY e.title ASC
      `;

      return { ...parseMeta(entry), links, backlinks };
    },
    ["getArchiveEntryBySlug", "v4", slug],
    { tags: [cacheTags.archive, cacheTags.archiveEntry(slug)] },
  )();
}

// Anzahl der Gespräche (Dialoge), an denen ein Teilnehmer (per slug — i.d.R.
// ein Charakter) beteiligt ist. jsonb-Containment auf metadata.participants.
export async function getDialogueCountByParticipant(
  slug: string,
): Promise<number> {
  return unstable_cache(
    async (): Promise<number> => {
      const [row] = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM archive_entries
        WHERE category = 'dialogue'
          AND NOT dialogue_open
          AND visibility = 'public'
          AND metadata->'participants' @> ${sql.json([{ slug }])}
      `;
      return row?.count ?? 0;
    },
    ["getDialogueCountByParticipant", "v3", slug],
    { tags: [cacheTags.archive] },
  )();
}

export interface UserContentArchiveEntry {
  id: number;
  slug: string;
  title: string;
  category: ArchiveCategory;
  visibility: "private" | "gm" | "public";
}

// Eigene Archiv-Einträge (owner_user_id, siehe scripts/schema.sql) für
// /users/[id]/content — ohne Kategorie 'dialogue', die dort separat über
// getDialoguesForUser läuft. Ungecacht wie getLogsForUser (Charaktere.ts):
// die Seite ist ohnehin durch requireOwnCharacters (Session-Zugriff)
// dynamisch.
export async function getArchiveEntriesForUser(
  userId: number,
): Promise<UserContentArchiveEntry[]> {
  return sql<UserContentArchiveEntry[]>`
    SELECT id, slug, title, category, visibility
    FROM archive_entries
    WHERE owner_user_id = ${userId} AND category != 'dialogue'
    ORDER BY title ASC
  `;
}

// Nur der Owner (owner_user_id) darf die Sichtbarkeit ändern — ein
// fremdes/gefälschtes id trifft dann einfach 0 Zeilen (gleiches Prinzip wie
// setDialogueVisibility in src/lib/dialoguesCore.ts, nur ohne die
// category='dialogue'-Einschränkung).
export async function setArchiveEntryVisibility(
  userId: number,
  archiveEntryId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${archiveEntryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug
  `;
  return rows[0] ?? null;
}

// Admin-Owner-Verwaltung (src/app/actions/owner.ts): anders als
// setArchiveEntryVisibility oben NICHT auf den aktuellen Owner gescoped
// (nur admin darf das, geprüft in der Server Action) — category='dialogue'
// bleibt trotzdem ausgeschlossen, Dialoge haben ihr eigenes
// Owner-/Teilnehmer-Modell.
export async function setArchiveEntryOwner(
  archiveEntryId: number,
  ownerId: number | null,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE id = ${archiveEntryId} AND category != 'dialogue'
    RETURNING slug
  `;
  return rows[0] ?? null;
}

// Alle Pfade für Sitemap und generateStaticParams — nur public, damit
// private/gm-Einträge nicht statisch vorgerendert oder gesitemappt werden
// (siehe getAllArchiveEntries).
export const getAllArchivePaths = unstable_cache(
  async (): Promise<ArchivePath[]> => {
    const rows = await sql<ArchivePath[]>`
      SELECT slug, updated_at::text AS updated_at
      FROM archive_entries
      WHERE NOT (category = 'dialogue' AND dialogue_open)
        AND visibility = 'public'
    `;
    return rows;
  },
  ["getAllArchivePaths", "v4"],
  { tags: [cacheTags.archive] },
);

// Für die Admin-Action "Autolinking" (src/app/actions/autolink.ts) — braucht
// id + rohen Markdown-Quelltext, unabhängig von Sichtbarkeit/Owner.
// Gespräche (category = 'dialogue') werden ausgeschlossen — deren Inhalt
// besteht aus Chat-Nachrichten (dialogue_messages), nicht aus source_md.
export async function getArchiveEntrySourceBySlug(
  slug: string,
): Promise<{ id: number; sourceMarkdown: string | null } | null> {
  const rows = await sql<{ id: number; sourceMarkdown: string | null }[]>`
    SELECT id, source_md AS "sourceMarkdown"
    FROM archive_entries
    WHERE slug = ${slug} AND category != 'dialogue'
  `;
  return rows[0] ?? null;
}

export async function updateArchiveEntryContent(
  archiveEntryId: number,
  bodyMarkdown: string,
  contentHtml: string,
): Promise<void> {
  await sql`
    UPDATE archive_entries
    SET content = ${contentHtml}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${archiveEntryId}
  `;
}

// Probiert slugifyBase(title), "${base}-2", "${base}-3", … bis ein Slug in
// archive_entries frei ist. Ursprünglich dialog-spezifisch (die Prüfung lief
// aber schon immer gegen archive_entries, da Dialoge selbst welche sind) —
// hierher verschoben und generalisiert, seitdem auch für
// createArchiveEntry unten genutzt. createDialogue (dialoguesCore.ts) fängt
// trotzdem Postgres-Code 23505 ab (kleines TOCTOU-Restrisiko bei
// zeitgleichen identischen Titeln).
export async function generateUniqueArchiveEntrySlug(
  title: string,
): Promise<string> {
  const base = slugifyBase(title);
  let candidate = base;
  let n = 2;

  for (;;) {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM archive_entries WHERE slug = ${candidate}) AS exists
    `;
    if (!row.exists) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

// Legt einen neuen, eigenen Archiv-Eintrag an (User-Feature: jeder
// eingeloggte User darf Archiv-Einträge anlegen, siehe
// /users/[id]/archive/new/actions.ts). Kategorie 'dialogue' ausgeschlossen —
// Dialoge haben ihr eigenes Anlage-Formular (createDialogue in
// dialoguesCore.ts) mit eigenem Daten-/Teilnehmer-Modell. visibility bleibt
// unangegeben → DB-Default 'public' (gleiche Konvention wie createMission/
// createMissionLog in src/lib/missions.ts).
export async function createArchiveEntry(input: {
  title: string;
  category: Exclude<ArchiveCategory, "dialogue">;
  tags: string[];
  summary: string | null;
  attributeValues: Record<string, string>;
  referenceValues: Record<string, string>;
  bodyMarkdown: string;
  ownerUserId: number;
  // Vorgerendertes HTML überspringt das eigene renderContentHtml() — genutzt
  // vom Opt-in "Automatisch verlinken" (createArchiveEntryAction), siehe
  // createMission in src/lib/missions.ts für dieselbe Begründung.
  contentHtml?: string;
}): Promise<{ id: number; slug: string }> {
  const slug = await generateUniqueArchiveEntrySlug(input.title);
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));
  const attributes = buildArchiveAttributes(input.category, input.attributeValues);

  const metadata: ArchiveMetadata = {
    summary: input.summary,
    attributes,
    characters: [],
    missions: [],
    setting: null,
    logDate: null,
    participants: [],
    location: null,
  };

  const [row] = await sql<{ id: number; slug: string }[]>`
    INSERT INTO archive_entries (
      slug, title, category, content, tags, metadata,
      source_md, frontmatter, owner_user_id, updated_at
    ) VALUES (
      ${slug}, ${input.title}, ${input.category}, ${contentHtml}, ${input.tags},
      ${sql.json(metadata as ReturnType<typeof JSON.parse>)}, ${input.bodyMarkdown},
      ${sql.json({})}, ${input.ownerUserId}, NOW()
    )
    RETURNING id, slug
  `;

  // Verweisfelder (related_missions/-characters/archive_links) erst nach dem
  // Insert auflösbar — braucht die neue entryId als source_id.
  const { missions, characters } = await saveArchiveReferences(
    row.id,
    slug,
    input.category,
    input.referenceValues,
  );
  if (missions.length > 0 || characters.length > 0) {
    await sql`
      UPDATE archive_entries
      SET metadata = metadata || ${sql.json({ missions, characters } as ReturnType<typeof JSON.parse>)}
      WHERE id = ${row.id}
    `;
  }

  return row;
}

export interface OwnArchiveEntryForEdit {
  id: number;
  slug: string;
  title: string;
  category: ArchiveCategory;
  tags: string[];
  sourceMarkdown: string;
  summary: string | null;
  // key (siehe archiveMetadataFields.ts) → aktueller Wert, für die
  // "Metadaten +/-"-Sektion.
  attributeValues: Record<string, string>;
  referenceValues: Record<string, string>;
}

// Für /users/[id]/archive/[entryId]/edit — lädt den rohen Markdown-Body
// (source_md) statt content, damit das Formular ihn editierbar vorbefüllen
// kann. Gleiche Owner-Prüfung wie setArchiveEntryVisibility oben, Dialoge
// ausgeschlossen (die haben kein source_md, ihr Inhalt lebt in
// dialogue_messages). slug wird zusätzlich zurückgegeben, damit das Opt-in
// "Automatisch verlinken" (updateArchiveEntryAction) den Eintrag selbst als
// Autolinking-Ziel ausschließen kann.
export async function getOwnArchiveEntryForEdit(
  userId: number,
  entryId: number,
): Promise<OwnArchiveEntryForEdit | null> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      title: string;
      category: ArchiveCategory;
      tags: string[];
      sourceMarkdown: string;
      metadata: ArchiveMetadata | string;
    }[]
  >`
    SELECT id, slug, title, category, tags, COALESCE(source_md, '') AS "sourceMarkdown", metadata
    FROM archive_entries
    WHERE id = ${entryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const metadata: ArchiveMetadata =
    typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;

  const attributeValues: Record<string, string> = {};
  for (const field of getAttributeFields(row.category)) {
    const found = metadata.attributes?.find((a) => a.label === field.label);
    if (found) attributeValues[field.key] = found.value;
  }

  const referenceValues: Record<string, string> = {
    related_missions: (metadata.missions ?? []).map((m) => m.slug).join(", "),
    related_characters: (metadata.characters ?? []).map((c) => c.slug).join(", "),
  };
  const linkRows = await sql<{ slug: string; label: string | null }[]>`
    SELECT e.slug, al.label
    FROM archive_links al
    JOIN archive_entries e ON e.id = al.target_id
    WHERE al.source_id = ${entryId}
  `;
  for (const field of getReferenceFields(row.category)) {
    if (OWN_TABLE_REFERENCE_KEYS.has(field.key)) continue;
    const slugs = linkRows
      .filter((l) => l.label === field.label)
      .map((l) => l.slug);
    if (slugs.length > 0) referenceValues[field.key] = slugs.join(", ");
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    tags: row.tags,
    sourceMarkdown: row.sourceMarkdown,
    summary: metadata.summary,
    attributeValues,
    referenceValues,
  };
}

// Bearbeitet Titel/Kategorie/Tags/Text eines eigenen Archiv-Eintrags — für
// das volle Bearbeiten-Formular (/users/[id]/archive/[entryId]/edit). Owner-
// gescoped im WHERE (ein gefälschtes id trifft dann einfach 0 Zeilen, kein
// separater Vorab-Check nötig — gleiches Prinzip wie updateMissionLogContent
// in src/lib/missions.ts). Rendert das Markdown selbst, anders als das
// admin-only updateArchiveEntryContent oben, das schon von den Content-Tools
// gerendertes HTML bekommt.
export async function updateOwnArchiveEntryContent(
  userId: number,
  entryId: number,
  input: {
    title: string;
    category: Exclude<ArchiveCategory, "dialogue">;
    tags: string[];
    summary: string | null;
    attributeValues: Record<string, string>;
    referenceValues: Record<string, string>;
    bodyMarkdown: string;
    // Siehe createArchiveEntry oben — Opt-in "Automatisch verlinken".
    contentHtml?: string;
  },
): Promise<{ slug: string } | null> {
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));
  const attributes = buildArchiveAttributes(input.category, input.attributeValues);
  const metadataPatch = { summary: input.summary, attributes };

  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET title = ${input.title}, category = ${input.category}, tags = ${input.tags},
        content = ${contentHtml}, source_md = ${input.bodyMarkdown},
        metadata = metadata || ${sql.json(metadataPatch as ReturnType<typeof JSON.parse>)},
        updated_at = NOW()
    WHERE id = ${entryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug
  `;
  const result = rows[0];
  if (!result) return null;

  // Erst nach bestätigtem Owner-Zugriff (obige UPDATE traf eine Zeile) die
  // Verweisfelder auflösen/schreiben — saveArchiveReferences selbst prüft
  // keine Berechtigung.
  const { missions, characters } = await saveArchiveReferences(
    entryId,
    result.slug,
    input.category,
    input.referenceValues,
  );
  await sql`
    UPDATE archive_entries
    SET metadata = metadata || ${sql.json({ missions, characters } as ReturnType<typeof JSON.parse>)}
    WHERE id = ${entryId}
  `;

  return result;
}

// Nur der Inhalt, nicht Titel/Kategorie/Tags — für den Inline-Editor auf der
// Detailseite (ArchiveEntryEditor.tsx), analog updateMissionSynopsis in
// src/lib/missions.ts (dort ebenfalls nur der Body, nicht Titel/Status/
// Termine). Owner-gescoped wie updateOwnArchiveEntryContent oben.
export async function updateOwnArchiveEntryBody(
  userId: number,
  entryId: number,
  bodyMarkdown: string,
  // Siehe createArchiveEntry oben — Opt-in "Automatisch verlinken".
  contentHtmlOverride?: string,
): Promise<{ slug: string; contentHtml: string } | null> {
  const contentHtml =
    contentHtmlOverride ?? (await renderContentHtml(bodyMarkdown));

  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET content = ${contentHtml}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${entryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug
  `;
  const row = rows[0];
  return row ? { slug: row.slug, contentHtml } : null;
}

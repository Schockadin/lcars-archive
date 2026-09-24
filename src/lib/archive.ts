import { cacheTag, cacheLife } from "next/cache";
import sql from "@/lib/db";
import { recordRevision } from "@/lib/contentRevisions";
import { cacheTags } from "@/lib/cacheTags";
import { renderContentHtml } from "@/lib/autolink";
import { slugifyBase } from "@/lib/slug";
import { contentImageSrc } from "@/lib/contentRoutes";
// getDialogueSubscribers deckt jeden archive_entry-Slug ab, nicht nur offene
// Dialoge (siehe Kommentar dort in dialoguesCore.ts) — hier für "normale"
// (nicht-Dialog-)Einträge wiederverwendet statt einer identischen Query.
import { getDialogueSubscribers } from "@/lib/dialogues";
import { sendArchiveEntryUpdatedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { deliverNotifications } from "@/lib/notificationDelivery";
// Fire-and-forget-Re-Embedding (RAG-Index) — siehe src/lib/embeddingSync.ts.
import {
  syncEmbeddings,
  syncEmbeddingDraft,
  syncEmbeddingActive,
  syncEmbeddingOwner,
} from "@/lib/embeddingSync";
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
// Exportiert, da auch der Markdown-Import (markdownImport.ts) dieselbe
// Record<string,string>-Konvention für Attributfelder verwendet und diese
// Logik nicht dupliziert.
export function buildArchiveAttributes(
  category: ArchiveCategory,
  attributeValues: Record<string, string>,
): ArchiveAttribute[] {
  return getAttributeFields(category)
    .map((field) => ({
      label: field.label,
      value: (attributeValues[field.key] ?? "").trim(),
    }))
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
): Promise<{
  missions: ArchiveMissionRef[];
  characters: ArchiveCharacterRef[];
}> {
  let missions: ArchiveMissionRef[] = [];
  let characters: ArchiveCharacterRef[] = [];
  const linkTargets: { targetId: number; label: string }[] = [];

  // Slugs der archive_entries-Verweisfelder (leader, headquarters,
  // participants, related_npcs, …) über alle Felder hinweg sammeln, statt
  // pro Feld eine eigene Query zu schicken — eine Kategorie kann mehrere
  // solcher Felder haben, ein Eintrag mit vielen ausgefüllten Verweisen sonst
  // ein Query pro Feld statt einer gebündelten Auflösung.
  const archiveEntryFieldSlugs: { slugs: string[]; label: string }[] = [];

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
      archiveEntryFieldSlugs.push({ slugs, label: field.label });
    }
  }

  if (archiveEntryFieldSlugs.length > 0) {
    const allSlugs = [
      ...new Set(archiveEntryFieldSlugs.flatMap((f) => f.slugs)),
    ];
    const rows = await sql<{ id: number; slug: string }[]>`
      SELECT id, slug FROM archive_entries WHERE slug = ANY(${allSlugs})
    `;
    const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));
    for (const { slugs, label } of archiveEntryFieldSlugs) {
      for (const slug of slugs) {
        const id = idBySlug.get(slug);
        if (id != null) linkTargets.push({ targetId: id, label });
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
    for (const { targetId, label } of linkTargets)
      uniqueTargets.set(targetId, label);
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
      aliases: raw.aliases ?? [],
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
// nicht nach Betrachter personalisierbar ("use cache", kein Session-
// Zugriff). private/gm-Einträge sind trotzdem über ihre Detailseite
// erreichbar (Laufzeit-Guard dort, siehe getArchiveEntryBySlug-Aufrufer).
export interface NpcOption {
  id: number;
  slug: string;
  name: string;
  // Für die Sichtbarkeitsprüfung beim Aufrufer (canView): ein NPC kann ein
  // unveröffentlichter Entwurf sein.
  isDraft: boolean;
  // Wer den Eintrag angelegt hat — gehört mit in canView, sonst sähe die
  // Person ihren eigenen Entwurf selbst nicht.
  ownerUserId: number | null;
}

// NPCs für die Gesprächs-Auswahl: Datenbank-Einträge der Kategorie "npc".
// Sie gehören niemandem — für sie schreibt im Gespräch ein Konto der
// Spielleitung (siehe dialogue_npc_speakers in scripts/schema.sql).
// Bewusst OHNE Sichtbarkeits-Filter in der Query: ob jemand einen NPC sehen
// darf, entscheidet dieselbe canView-Regel wie überall sonst (veröffentlicht
// für alle, Entwurf nur für die Owner-Person) — der Aufrufer filtert damit,
// statt dass hier eine zweite, abweichende Regel entsteht.
export async function getNpcOptions(): Promise<NpcOption[]> {
  return sql<NpcOption[]>`
    SELECT id, slug, title AS name, is_draft AS "isDraft",
           owner_user_id AS "ownerUserId"
    FROM archive_entries
    WHERE category = 'npc' AND deleted_at IS NULL
    ORDER BY title ASC
  `;
}

// Zeilenform von getAllArchiveEntries: wie die Vorschau, nur trägt die
// Abfrage statt des fertigen Bild-Links die Id des ersten hochgeladenen
// Bildes (null = keines).
interface ArchiveEntryRow extends Omit<ArchiveEntryPreview, "thumbnail"> {
  image_id: number | null;
}

export async function getAllArchiveEntries(): Promise<ArchiveEntryPreview[]> {
  "use cache";
  cacheTag(cacheTags.archive);
  cacheLife("max");
  const rows = await sql<ArchiveEntryRow[]>`
      SELECT
        a.id,
        a.slug,
        a.title,
        a.category,
        a.tags,
        a.metadata,
        -- Das zuerst hochgeladene Bild des Eintrags als Vorschaubild der
        -- Karte; LATERAL statt einer zweiten Abfrage je Zeile.
        img.id AS image_id
      FROM archive_entries a
      LEFT JOIN LATERAL (
        SELECT i.id
        FROM content_images i
        WHERE i.content_type = 'archive_entry' AND i.content_id = a.id
        ORDER BY i.created_at ASC, i.id ASC
        LIMIT 1
      ) img ON TRUE
      -- Gespräche gehören in die Chronologie, nicht in die Enzyklopädie: ein
      -- offenes lebt unter /dialogues, ein abgeschlossenes steht in der
      -- Chronologie unter der Ereignisart „Gespräch" (siehe getTimeline).
      -- Diese Übersicht führt sie deshalb gar nicht — sie ist zugleich die
      -- Auswahl der verknüpfbaren Orte/NPCs in den Gesprächs-Formularen.
      WHERE NOT a.category = 'dialogue'
        AND a.deleted_at IS NULL
        AND a.is_draft = false
      ORDER BY a.title ASC
    `;
  return rows.map(({ image_id, ...row }) => ({
    ...parseMeta(row),
    thumbnail: image_id ? contentImageSrc(image_id) : null,
  }));
}

// Ein Archiv-Eintrag per Slug inkl. aufgelöster Verweise (ein-/ausgehend).
export async function getArchiveEntryBySlug(
  slug: string,
): Promise<ArchiveEntryDetail | null> {
  "use cache";
  cacheTag(cacheTags.archive, cacheTags.archiveEntry(slug));
  cacheLife("max");
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
          owner_user_id AS "ownerUserId",
          is_draft AS "isDraft",
          updated_at::text AS updated_at,
          COALESCE(source_md, '') AS "sourceMarkdown"
        FROM archive_entries
        WHERE slug = ${slug} AND deleted_at IS NULL
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
        WHERE al.source_id = ${entry.id} AND e.deleted_at IS NULL
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
        WHERE al.target_id = ${entry.id} AND e.deleted_at IS NULL
        ORDER BY e.title ASC
      `;

  return { ...parseMeta(entry), links, backlinks };
}

export interface UserContentArchiveEntry {
  id: number;
  slug: string;
  title: string;
  category: ArchiveCategory;
  isDraft: boolean;
}

// Eigene Archiv-Einträge (owner_user_id, siehe scripts/schema.sql) für
// /user/content — ohne Kategorie 'dialogue', die dort separat über
// getDialoguesForUser läuft. Ungecacht wie getLogsForUser (Charaktere.ts):
// die Seite ist ohnehin durch requireOwnCharacters (Session-Zugriff)
// dynamisch.
export async function getArchiveEntriesForUser(
  userId: number,
): Promise<UserContentArchiveEntry[]> {
  return sql<UserContentArchiveEntry[]>`
    SELECT id, slug, title, category, is_draft AS "isDraft"
    FROM archive_entries
    WHERE owner_user_id = ${userId} AND category != 'dialogue' AND deleted_at IS NULL
    ORDER BY title ASC
  `;
}

// Nur der Owner (owner_user_id) darf veröffentlichen oder zurückziehen — ein
// fremdes/gefälschtes id trifft dann einfach 0 Zeilen (gleiches Prinzip wie
// setDialogueDraft in src/lib/dialoguesCore.ts, nur ohne die
// category='dialogue'-Einschränkung).
export async function setArchiveEntryDraft(
  userId: number,
  archiveEntryId: number,
  isDraft: boolean,
): Promise<{
  slug: string;
  title: string;
  sourceMarkdown: string | null;
} | null> {
  const rows = await sql<
    { slug: string; title: string; sourceMarkdown: string | null }[]
  >`
    UPDATE archive_entries
    SET is_draft = ${isDraft}, updated_at = NOW()
    WHERE id = ${archiveEntryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug, title, source_md AS "sourceMarkdown"
  `;
  if (rows[0]) syncEmbeddingDraft("archive_entry", archiveEntryId, isDraft);
  return rows[0] ?? null;
}

// Moderation (ActionsMenu.tsx/AdminContentStateSelect.tsx): anders als
// setArchiveEntryDraft/setDialogueDraft oben NICHT auf den Owner gescoped
// (nur mit content.moderate, geprüft in setContentStateAdminAction) und OHNE
// category-Einschränkung — die Moderation darf hier bewusst auch Gespräche
// umstellen, anders als setArchiveEntryOwner unten, das Dialoge ausschließt
// (eigenes Owner-/Teilnehmer-Modell, aber kein eigenes Entwurf-Modell:
// dialogue-Einträge nutzen dieselbe is_draft-Spalte).
export async function setArchiveEntryDraftAdmin(
  archiveEntryId: number,
  isDraft: boolean,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET is_draft = ${isDraft}, updated_at = NOW()
    WHERE id = ${archiveEntryId}
    RETURNING slug
  `;
  // Diese Funktion umfasst auch Dialoge (kein category-Filter) — beide
  // möglichen content_type-Zeilen nachziehen (nur eine existiert je Id).
  if (rows[0]) {
    syncEmbeddingDraft("archive_entry", archiveEntryId, isDraft);
    syncEmbeddingDraft("dialogue", archiveEntryId, isDraft);
  }
  return rows[0] ?? null;
}

// Admin-Owner-Verwaltung (src/app/actions/owner.ts): anders als
// setArchiveEntryVisibility oben NICHT auf den aktuellen Owner gescoped (nur
// admin darf das, geprüft in der Server Action). Gilt auch für Dialoge (owner
// = wer den Dialog gestartet hat, siehe createDialogue) — reines
// owner_user_id-Update, berührt metadata.participants nicht.
export async function setArchiveEntryOwner(
  archiveEntryId: number,
  ownerId: number | null,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries
    SET owner_user_id = ${ownerId}, updated_at = NOW()
    WHERE id = ${archiveEntryId}
    RETURNING slug
  `;
  // Gilt auch für Dialoge — beide möglichen content_type-Zeilen nachziehen.
  if (rows[0]) {
    syncEmbeddingOwner("archive_entry", archiveEntryId, ownerId);
    syncEmbeddingOwner("dialogue", archiveEntryId, ownerId);
  }
  return rows[0] ?? null;
}

// Alle Pfade für Sitemap und generateStaticParams — nur public, damit
// private/gm-Einträge nicht statisch vorgerendert oder gesitemappt werden
// (siehe getAllArchiveEntries).
export async function getAllArchivePaths(): Promise<ArchivePath[]> {
  "use cache";
  cacheTag(cacheTags.archive);
  cacheLife("max");
  const rows = await sql<ArchivePath[]>`
      SELECT slug, updated_at::text AS updated_at
      FROM archive_entries
      WHERE NOT (category = 'dialogue' AND dialogue_open)
        AND deleted_at IS NULL
        AND is_draft = false
    `;
  return rows;
}

// Für die Admin-Action "Autolinking" (src/app/actions/autolink.ts) — braucht
// id + rohen Markdown-Quelltext, unabhängig von Sichtbarkeit/Owner.
// Gespräche (category = 'dialogue') werden ausgeschlossen — deren Inhalt
// besteht aus Chat-Nachrichten (dialogue_messages), nicht aus source_md.
export async function getArchiveEntrySourceBySlug(slug: string): Promise<{
  id: number;
  sourceMarkdown: string | null;
  // Für die Rechteprüfung der Content-Werkzeuge (src/app/actions/
  // contentTools.ts): Wer den Inhalt besitzt, darf sie darauf anwenden.
  ownerId: number | null;
} | null> {
  const rows = await sql<
    { id: number; sourceMarkdown: string | null; ownerId: number | null }[]
  >`
    SELECT id, source_md AS "sourceMarkdown", owner_user_id AS "ownerId"
    FROM archive_entries
    WHERE slug = ${slug} AND category != 'dialogue'
  `;
  return rows[0] ?? null;
}

export async function updateArchiveEntryContent(
  archiveEntryId: number,
  bodyMarkdown: string,
  contentHtml: string,
  // Nur für die Versionshistorie (siehe contentRevisions.ts).
  editorId: number | null = null,
): Promise<void> {
  await recordRevision("archive", archiveEntryId, editorId, bodyMarkdown);
  await sql`
    UPDATE archive_entries
    SET content = ${contentHtml}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${archiveEntryId}
  `;
  syncEmbeddings("archive_entry", archiveEntryId);
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
// /user/archive/new/actions.ts). Kategorie 'dialogue' ausgeschlossen —
// Dialoge haben ihr eigenes Anlage-Formular (createDialogue in
// dialoguesCore.ts) mit eigenem Daten-/Teilnehmer-Modell.
export async function createArchiveEntry(input: {
  title: string;
  category: Exclude<ArchiveCategory, "dialogue">;
  tags: string[];
  summary: string | null;
  aliases: string[];
  attributeValues: Record<string, string>;
  referenceValues: Record<string, string>;
  bodyMarkdown: string;
  ownerUserId: number;
  isDraft: boolean;
  // Vorgerendertes HTML überspringt das eigene renderContentHtml() — genutzt
  // vom Opt-in "Automatisch verlinken" (createArchiveEntryAction), siehe
  // createMission in src/lib/missions.ts für dieselbe Begründung.
  contentHtml?: string;
}): Promise<{ id: number; slug: string }> {
  const slug = await generateUniqueArchiveEntrySlug(input.title);
  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));
  const attributes = buildArchiveAttributes(
    input.category,
    input.attributeValues,
  );

  const metadata: ArchiveMetadata = {
    summary: input.summary,
    aliases: input.aliases,
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
      source_md, frontmatter, owner_user_id, is_draft, updated_at
    ) VALUES (
      ${slug}, ${input.title}, ${input.category}, ${contentHtml}, ${input.tags},
      ${sql.json(metadata as ReturnType<typeof JSON.parse>)}, ${input.bodyMarkdown},
      ${sql.json({})}, ${input.ownerUserId}, ${input.isDraft}, NOW()
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

  syncEmbeddings("archive_entry", row.id);
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
  aliases: string[];
  // key (siehe archiveMetadataFields.ts) → aktueller Wert, für die
  // "Metadaten +/-"-Sektion.
  attributeValues: Record<string, string>;
  referenceValues: Record<string, string>;
  isDraft: boolean;
}

// Für /user/archive/[entryId]/edit — lädt den rohen Markdown-Body
// (source_md) statt content, damit das Formular ihn editierbar vorbefüllen
// kann. Gleiche Owner-Prüfung wie setArchiveEntryVisibility oben, Dialoge
// ausgeschlossen (die haben kein source_md, ihr Inhalt lebt in
// dialogue_messages). slug wird zusätzlich zurückgegeben, damit das Opt-in
// "Automatisch verlinken" (updateArchiveEntryAction) den Eintrag selbst als
// Autolinking-Ziel ausschließen kann.
//
// asModerator hebt die Owner-Prüfung auf: Seit der Bearbeiten-Stift auf der
// Leseseite in genau diesen Editor springt (siehe ActionsMenu.tsx), muss er
// auch für die Spielleitung/Administration erreichbar sein — dieselbe Gruppe,
// die den Stift auf fremden Einträgen überhaupt sieht (content.moderate). Das
// Recht prüft die aufrufende Seite bzw. Action, NICHT diese Funktion.
export async function getOwnArchiveEntryForEdit(
  userId: number,
  entryId: number,
  asModerator = false,
): Promise<OwnArchiveEntryForEdit | null> {
  const ownerScope = asModerator ? sql`` : sql`AND owner_user_id = ${userId}`;
  const rows = await sql<
    {
      id: number;
      slug: string;
      title: string;
      category: ArchiveCategory;
      tags: string[];
      sourceMarkdown: string;
      metadata: ArchiveMetadata | string;
      isDraft: boolean;
    }[]
  >`
    SELECT id, slug, title, category, tags, COALESCE(source_md, '') AS "sourceMarkdown",
           metadata, is_draft AS "isDraft"
    FROM archive_entries
    WHERE id = ${entryId} AND category != 'dialogue' ${ownerScope}
      AND deleted_at IS NULL
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
    related_characters: (metadata.characters ?? [])
      .map((c) => c.slug)
      .join(", "),
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
    aliases: metadata.aliases ?? [],
    attributeValues,
    referenceValues,
    isDraft: row.isDraft,
  };
}

// Ergebnis von updateOwnArchiveEntryContent. Titel und Aliase VOR dem Update
// kommen mit zurück — siehe UpdateOwnCharacterResult in characters.ts für
// dieselbe Begründung (Umbenennung erkennen, Verlinkungen nachziehen).
export interface UpdateOwnArchiveEntryResult {
  slug: string;
  wasDraft: boolean;
  previousTitle: string;
  previousAliases: string[] | null;
}

// Bearbeitet Titel/Kategorie/Tags/Text eines eigenen Archiv-Eintrags — für
// das volle Bearbeiten-Formular (/user/archive/[entryId]/edit). Owner-
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
    aliases: string[];
    attributeValues: Record<string, string>;
    referenceValues: Record<string, string>;
    bodyMarkdown: string;
    isDraft: boolean;
    // Siehe createArchiveEntry oben — Opt-in "Automatisch verlinken".
    contentHtml?: string;
  },
  // Wie bei getOwnArchiveEntryForEdit oben: hebt die Owner-Prüfung für die
  // Moderation auf. Das Recht (content.moderate) prüft die Action.
  asModerator = false,
): Promise<UpdateOwnArchiveEntryResult | null> {
  await recordRevision("archive", entryId, userId, input.bodyMarkdown);

  const ownerScope = asModerator ? sql`` : sql`AND owner_user_id = ${userId}`;

  const contentHtml =
    input.contentHtml ?? (await renderContentHtml(input.bodyMarkdown));
  const attributes = buildArchiveAttributes(
    input.category,
    input.attributeValues,
  );
  const metadataPatch = {
    summary: input.summary,
    aliases: input.aliases,
    attributes,
  };

  // wasDraft (Stand VOR diesem Update) per CTE — siehe
  // updateOwnCharacterContent in characters.ts für dieselbe Begründung.
  const rows = await sql<UpdateOwnArchiveEntryResult[]>`
    WITH old AS (
      SELECT is_draft, title, metadata->'aliases' AS aliases
      FROM archive_entries WHERE id = ${entryId}
    )
    UPDATE archive_entries
    SET title = ${input.title}, category = ${input.category}, tags = ${input.tags},
        content = ${contentHtml}, source_md = ${input.bodyMarkdown},
        metadata = metadata || ${sql.json(metadataPatch as ReturnType<typeof JSON.parse>)},
        is_draft = ${input.isDraft}, updated_at = NOW()
    FROM old
    WHERE id = ${entryId} AND category != 'dialogue' ${ownerScope}
    RETURNING slug, old.is_draft AS "wasDraft",
              old.title AS "previousTitle", old.aliases AS "previousAliases"
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

  syncEmbeddings("archive_entry", entryId);
  return result;
}

// Nur der Inhalt, nicht Titel/Kategorie/Tags — für das Zurückholen einer
// älteren Fassung (app/actions/revisions.ts), analog updateMissionSynopsis in
// src/lib/missions.ts (dort ebenfalls nur der Body, nicht Titel/Status/
// Termine). Owner-gescoped wie updateOwnArchiveEntryContent oben.
export async function updateOwnArchiveEntryBody(
  userId: number,
  entryId: number,
  bodyMarkdown: string,
  // Siehe createArchiveEntry oben — Opt-in "Automatisch verlinken".
  contentHtmlOverride?: string,
): Promise<{ slug: string; title: string; contentHtml: string } | null> {
  await recordRevision("archive", entryId, userId, bodyMarkdown);

  const contentHtml =
    contentHtmlOverride ?? (await renderContentHtml(bodyMarkdown));

  const rows = await sql<{ slug: string; title: string }[]>`
    UPDATE archive_entries
    SET content = ${contentHtml}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${entryId} AND category != 'dialogue' AND owner_user_id = ${userId}
    RETURNING slug, title
  `;
  const row = rows[0];
  if (row) syncEmbeddings("archive_entry", entryId);
  return row ? { slug: row.slug, title: row.title, contentHtml } : null;
}

// Benachrichtigt alle Abonnenten eines Archiv-Eintrags (content_follows,
// target_type 'archive_entry'), dass sich etwas an ihm geändert hat — analog
// notifyCharacterSubscribers in characters.ts. Gerufen von beiden
// Bearbeiten-Wegen (volles Formular: archive/_shared/contentAction.ts;
// Inline-Body-Editor: app/actions/archive.ts#updateOwnArchiveEntryAction),
// jeweils NACH dem erfolgreichen Speichern. Nur für nicht-Dialog-Einträge
// relevant (beide Aufrufer schließen category='dialogue' bereits aus) —
// Dialoge haben ihre eigene Benachrichtigung (Nachrichten-Abo, siehe
// dialoguesCore.ts). editingUserId schließt den Bearbeitenden selbst aus.
export async function notifyArchiveEntrySubscribers(input: {
  entrySlug: string;
  entryTitle: string;
  editingUserId: number;
  preview: string;
}): Promise<void> {
  const subscribers = await getDialogueSubscribers(
    input.entrySlug,
    input.editingUserId,
  );
  if (subscribers.length === 0) return;

  const entryUrl = `${await getBaseUrl()}/archive/${input.entrySlug}`;
  await deliverNotifications(subscribers, {
    context: "archive.ts:notifyArchiveEntrySubscribers",
    emailFailureLabel: "Datenbank-Update-Mail",
    sendEmail: (subscriber) =>
      sendArchiveEntryUpdatedEmail({
        to: subscriber.email,
        name: subscriber.name,
        entryTitle: input.entryTitle,
        entryUrl,
        preview: input.preview,
      }),
    sendPush: (subscriber) =>
      sendPushToUser(subscriber.id, {
        title: `Aktualisiert: ${input.entryTitle}`,
        body: input.preview,
        url: entryUrl,
      }),
  });
}

// Löscht einen Archiv-Eintrag (KEINE Dialoge — dafür siehe deleteDialogue in
// dialoguesCore.ts, gleiche Soft-Delete-Semantik) weich (deleted_at gesetzt
// statt DELETE) — bleibt in der DB, verschwindet aber aus allen Listen/der
// Suche/der Timeline für alle außer Admins (siehe getAllContentForAdmin/
// Trash-Ansicht in lib/adminContent.ts) und wird nach 7 Tagen vom
// Purge-Cronjob endgültig entfernt. archive_links/content_follows werden
// bewusst NICHT sofort entfernt — ein wiederhergestellter Eintrag soll seine
// Verweise/Abos zurückbekommen (siehe restoreArchiveEntry), Bereinigung
// passiert erst beim endgültigen Purge. Admin-only, kein Owner-Scoping.
// deletedByUserId dient nur dem Löschprotokoll (content_deletions, siehe
// getRecentDeletions in recentActivity.ts).
export async function deleteArchiveEntry(
  archiveEntryId: number,
  deletedByUserId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<
    {
      slug: string;
      title: string;
      ownerUserId: number | null;
      isDraft: boolean;
    }[]
  >`
    UPDATE archive_entries
    SET deleted_at = NOW()
    WHERE id = ${archiveEntryId} AND category != 'dialogue' AND deleted_at IS NULL
    RETURNING slug, title, owner_user_id AS "ownerUserId", is_draft AS "isDraft"
  `;
  const row = rows[0] ?? null;
  if (row) syncEmbeddingActive("archive_entry", archiveEntryId, false);
  if (row && !row.isDraft) {
    await sql`
      INSERT INTO content_deletions (target_type, title, owner_user_id, deleted_by)
      VALUES ('archive_entry', ${row.title}, ${row.ownerUserId}, ${deletedByUserId})
    `;
  }
  return row ? { slug: row.slug } : null;
}

// Selbstlöschung durch die Owner-Person (Meine Inhalte) — Ownership per
// owner_user_id direkt im WHERE erzwungen statt per Vorab-Check, gleiches
// Prinzip wie deleteMissionLog in missions.ts. Ein Eintrag ohne Owner
// (owner_user_id IS NULL) matcht dadurch für niemanden, kein Sonderfall
// nötig. Kein Admin-Bypass — für fremde Einträge bleibt deleteArchiveEntry
// (requireAdmin) der richtige Weg.
export async function deleteOwnArchiveEntry(
  userId: number,
  archiveEntryId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<
    {
      slug: string;
      title: string;
      isDraft: boolean;
    }[]
  >`
    UPDATE archive_entries
    SET deleted_at = NOW()
    WHERE id = ${archiveEntryId} AND owner_user_id = ${userId}
      AND category != 'dialogue' AND deleted_at IS NULL
    RETURNING slug, title, is_draft AS "isDraft"
  `;
  const row = rows[0] ?? null;
  if (row) syncEmbeddingActive("archive_entry", archiveEntryId, false);
  if (row && !row.isDraft) {
    await sql`
      INSERT INTO content_deletions (target_type, title, owner_user_id, deleted_by)
      VALUES ('archive_entry', ${row.title}, ${userId}, ${userId})
    `;
  }
  return row ? { slug: row.slug } : null;
}

// Macht einen weich gelöschten Archiv-Eintrag wieder sichtbar (Admin-Trash-Ansicht).
export async function restoreArchiveEntry(
  archiveEntryId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE archive_entries SET deleted_at = NULL
    WHERE id = ${archiveEntryId} AND deleted_at IS NOT NULL
    RETURNING slug
  `;
  // Ohne category-Filter — deckt auch Dialoge ab; beide möglichen
  // content_type-Zeilen reaktivieren (nur eine existiert je Id).
  if (rows[0]) {
    syncEmbeddingActive("archive_entry", archiveEntryId, true);
    syncEmbeddingActive("dialogue", archiveEntryId, true);
  }
  return rows[0] ?? null;
}

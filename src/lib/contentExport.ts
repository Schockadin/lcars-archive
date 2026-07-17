// Baut aus einem bestehenden Inhalt (Archiv-Eintrag/Dialog, Mission,
// Missionslog, Charakter) einen exportierbaren Markdown-Text (mit
// YAML-Frontmatter, für den PDF-Export weiterverwendet) — die Umkehrung von
// src/lib/markdownImport.ts. Bewusst KEIN Anspruch auf ein zu
// markdownImport.ts wieder re-importierbares 1:1-Frontmatter-Format; die
// Felder sind eine sinnvolle, lesbare Auswahl für Sicherung/Teilen, nicht
// ein Roundtrip-Format. Jede load*-Funktion prüft dieselbe
// Sichtbarkeits-/Teilnehmer-Berechtigung wie die jeweilige Detailseite
// selbst (canView bzw. Teilnehmer-Status bei offenen Dialogen) — die
// Export-Routen (src/app/api/export/markdown/route.ts,
// src/app/api/export/pdf/route.ts) verlassen sich vollständig auf diese
// Prüfung, um keinen privaten Inhalt über einen zweiten, ungeprüften
// Lesepfad offenzulegen.
import "server-only";
import sql from "@/lib/db";
import { getViewer, canView } from "@/lib/visibility";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { getMissionBySlug, getLogBySlug } from "@/lib/missions";
import { getCharacterBySlug, getCharacterSourceBySlug } from "@/lib/characters";
import { getDialogueParticipant, buildDialogueFlowingText } from "@/lib/dialogues";

export const EXPORT_CONTENT_TYPES = [
  "archive_entry",
  "mission",
  "mission_log",
  "character",
] as const;
export type ExportContentType = (typeof EXPORT_CONTENT_TYPES)[number];

export function isExportContentType(value: string): value is ExportContentType {
  return (EXPORT_CONTENT_TYPES as readonly string[]).includes(value);
}

export interface ExportableContent {
  title: string;
  // Nur primitive/einfache Werte bzw. Arrays davon — direkt an
  // gray-matter/matter.stringify durchgereicht.
  frontmatter: Record<string, unknown>;
  bodyMarkdown: string;
  filenameBase: string;
}

async function loadArchiveEntryExport(slug: string): Promise<ExportableContent | null> {
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry) return null;

  const viewer = await getViewer();
  const isOpenDialogue = entry.category === "dialogue" && entry.dialogue_open;

  if (isOpenDialogue) {
    // Offene Dialoge haben keine eigene Sichtbarkeits-Sperre — Zugriff ist
    // rein teilnehmerbasiert, exakt wie in /dialogues/[slug]/page.tsx.
    const participant =
      viewer && (await getDialogueParticipant(entry.id, viewer.userId));
    if (!participant && viewer?.role !== "gm" && viewer?.role !== "admin") {
      return null;
    }
  } else if (!canView(entry.visibility, entry.ownerUserId, viewer)) {
    return null;
  }

  const frontmatter: Record<string, unknown> = {
    title: entry.title,
    slug: entry.slug,
    category: entry.category,
    tags: entry.tags,
    summary: entry.metadata.summary,
    attributes: entry.metadata.attributes,
    characters: entry.metadata.characters.map((c) => c.slug),
    missions: entry.metadata.missions.map((m) => m.slug),
  };

  let bodyMarkdown = entry.sourceMarkdown;
  if (entry.category === "dialogue") {
    frontmatter.participants = entry.metadata.participants.map((p) => p.slug);
    frontmatter.location = entry.metadata.location?.slug ?? null;
    frontmatter.logDate = entry.metadata.logDate;
    frontmatter.setting = entry.metadata.setting;
    if (isOpenDialogue) {
      // Offene Dialoge haben noch keinen Fließtext auf der archive_entries-
      // Zeile selbst (der entsteht erst beim Abschließen, siehe
      // regenerateDialogueContent) — dieselbe Nachrichten-Zusammenfassung
      // live aus dialogue_messages bauen, statt eine zweite Implementierung
      // zu pflegen.
      bodyMarkdown = (await buildDialogueFlowingText(sql, entry.id)).markdown;
    }
  }

  return { title: entry.title, frontmatter, bodyMarkdown, filenameBase: entry.slug };
}

async function loadMissionExport(slug: string): Promise<ExportableContent | null> {
  // Missionen haben keine eigene Sichtbarkeits-Sperre (immer öffentlich
  // lesbar, siehe src/app/missions/[missionSlug]/page.tsx).
  const mission = await getMissionBySlug(slug);
  if (!mission) return null;

  const frontmatter: Record<string, unknown> = {
    title: mission.title,
    slug: mission.slug,
    status: mission.status,
    started_at: mission.started_at,
    ended_at: mission.ended_at,
    tags: mission.metadata.tags,
    teaser: mission.metadata.teaser,
    participants: mission.participants.map((p) => p.slug),
  };

  return {
    title: mission.title,
    frontmatter,
    bodyMarkdown: mission.sourceMarkdown ?? "",
    filenameBase: mission.slug,
  };
}

async function loadMissionLogExport(slug: string): Promise<ExportableContent | null> {
  const log = await getLogBySlug(slug);
  if (!log) return null;

  const viewer = await getViewer();
  const visible =
    log.visibility === "public" || canView(log.visibility, log.ownerUserId, viewer);
  if (!visible) return null;

  const [row] = await sql<{ source_md: string | null }[]>`
    SELECT source_md FROM mission_logs WHERE slug = ${slug}
  `;

  const frontmatter: Record<string, unknown> = {
    title: log.title,
    slug: log.slug,
    type: "mission-log",
    mission: log.mission_slug,
    mission_title: log.mission_title,
    author: log.author_slug,
    session_nr: log.session_nr,
    log_date: log.log_date,
  };

  return {
    title: log.title,
    frontmatter,
    bodyMarkdown: row?.source_md ?? "",
    filenameBase: log.slug,
  };
}

async function loadCharacterExport(slug: string): Promise<ExportableContent | null> {
  const character = await getCharacterBySlug(slug);
  if (!character) return null;

  const viewer = await getViewer();
  const visible =
    character.visibility === "public" ||
    canView(character.visibility, character.player_id, viewer);
  if (!visible) return null;

  const source = await getCharacterSourceBySlug(slug);

  const frontmatter: Record<string, unknown> = {
    title: character.name,
    slug: character.slug,
    status: character.status,
    rank: character.metadata.rank,
    species: character.metadata.species,
    homeworld: character.metadata.homeworld,
    age: character.metadata.age,
    affiliation: character.metadata.affiliation,
    tags: character.metadata.tags,
    aliases: character.metadata.aliases,
    generation: character.metadata.generation,
    joined_at: character.joined_at,
    left_at: character.left_at,
  };

  return {
    title: character.name,
    frontmatter,
    bodyMarkdown: source?.sourceMarkdown ?? character.bio ?? "",
    filenameBase: character.slug,
  };
}

export async function loadExportableContent(
  type: ExportContentType,
  slug: string,
): Promise<ExportableContent | null> {
  switch (type) {
    case "archive_entry":
      return loadArchiveEntryExport(slug);
    case "mission":
      return loadMissionExport(slug);
    case "mission_log":
      return loadMissionLogExport(slug);
    case "character":
      return loadCharacterExport(slug);
  }
}

import { cacheTag, cacheLife } from "next/cache";
import sql from "@/lib/db";
import { recordRevision } from "@/lib/contentRevisions";
import { cacheTags } from "@/lib/cacheTags";
import { renderContentHtml } from "@/lib/autolink";
import { slugifyBase } from "@/lib/slug";
import { Character, CharacterMetadata } from "@/types/character";
import type { CharacterStats } from "@/types/characterStats";
import { parseCharacterStats } from "@/lib/characterStats";
import type { PortraitCrop } from "@/lib/portraitCrop";
import { MissionLogPreview } from "@/types/missionLog";
// getCharacterSubscribers lebt in dialoguesCore.ts (ursprünglich für den
// Dialog-Abschluss gebraucht, siehe dort) und wird hier für die
// Charakter-Update-Benachrichtigung wiederverwendet — Import über den
// "server-only"-Wrapper @/lib/dialogues statt @/lib/dialoguesCore direkt, da
// characters.ts ("use cache"-Direktiven unten) ohnehin nur innerhalb von
// Next.js läuft, nie per tsx (anders als dialoguesCore.ts selbst, das
// deshalb bewusst nicht umgekehrt aus @/lib/follows importieren darf, siehe
// dessen Kommentar in createDialogue).
import { getCharacterSubscribers } from "@/lib/dialogues";
import { sendCharacterUpdatedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { logCaughtError } from "@/lib/errorLog";
import { isUniqueViolation } from "@/lib/users";
// Fire-and-forget-Re-Embedding (RAG-Index) nach Content-Mutationen — siehe
// src/lib/embeddingSync.ts (überspringt still ohne OPENAI_API_KEY).
import {
  syncEmbeddings,
  syncEmbeddingVisibility,
  syncEmbeddingActive,
  syncEmbeddingOwner,
  syncCharacterEmbeddingsOwnerCleared,
} from "@/lib/embeddingSync";

// Hilfsfunktion: stellt sicher dass metadata ein Objekt ist.
//
// Entfernt dabei standardmäßig metadata.stats (die Charakterwerte, siehe
// characterStats.ts): die Charakterliste und die Charakter-Detailseite sind
// Client-Komponenten — alles, was hier drinsteckt, landet zusätzlich zur
// DB-Übertragung serialisiert im RSC-Payload des Browsers (gleiche Überlegung
// wie bei CharacterListItem unten). Die Werte zeigt dort nichts an, sie haben
// im öffentlichen Payload also nichts verloren. Wer sie WIRKLICH braucht
// (eigene Charakterübersicht), fordert sie mit keepStats explizit an.
function parseCharacter(
  row: Character,
  options?: { keepStats?: boolean },
): Character {
  const metadata =
    typeof row.metadata === "string"
      ? (JSON.parse(row.metadata) as CharacterMetadata)
      : row.metadata;

  return {
    ...row,
    metadata: options?.keepStats ? metadata : stripStats(metadata),
  };
}

function stripStats(metadata: CharacterMetadata): CharacterMetadata {
  if (metadata?.stats === undefined) return metadata;
  const { stats: _stats, ...rest } = metadata;
  return rest;
}

// Schlanke Zeilen-Variante von getAllCharacters für Aufrufer, die nur die
// Eckdaten brauchen: die Charakterliste (/characters) und die Sitemap.
//
// Bewusst nur die Felder, die dort wirklich gebraucht werden — die Liste ist
// eine Client-Komponente, jedes mitgelieferte Feld landet also zusätzlich zur
// DB-Übertragung auch noch serialisiert im RSC-Payload des Browsers. Mit
// SELECT * kamen dort bislang bio (gerendertes HTML), source_md (Rohtext) und
// frontmatter JEDES Charakters mit, obwohl die Übersicht nur Name/Rang/Status
// anzeigt. updated_at trägt die Sitemap als lastModified, kostet aber nur
// einen Zeitstempel pro Zeile.
export type CharacterListItem = Pick<
  Character,
  "id" | "slug" | "name" | "status" | "metadata" | "updated_at"
>;

export async function getCharacterListItems(): Promise<CharacterListItem[]> {
  "use cache";
  cacheTag(cacheTags.characters);
  cacheLife("max");
  const rows = await sql<CharacterListItem[]>`
        SELECT id, slug, name, status, metadata, updated_at
        FROM characters
        WHERE visibility = 'public' AND deleted_at IS NULL AND is_draft = false
        ORDER BY
          CASE status
            WHEN 'active'   THEN 1
            WHEN 'retired'  THEN 2
            WHEN 'deceased' THEN 3
          END,
          name ASC
      `;
  return rows.map((row) => ({
    ...row,
    // stats bleiben draußen, siehe parseCharacter oben — die Liste ist eine
    // Client-Komponente und zeigt keine Werte an.
    metadata: stripStats(
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as CharacterMetadata)
        : row.metadata,
    ),
  }));
}

// Nur public-Charaktere — speist die Detail-generateStaticParams, die
// Sitemap und die öffentliche API-Route (die bewusst den vollen Datensatz
// ausliefert). private/gm-Charaktere bleiben trotzdem über ihre Detailseite
// erreichbar (Laufzeit-Guard dort). Für die Übersichtsliste stattdessen
// getCharacterListItems() nutzen.
export async function getAllCharacters(): Promise<Character[]> {
  "use cache";
  cacheTag(cacheTags.characters);
  cacheLife("max");
  const rows = await sql<Character[]>`
        SELECT *
        FROM characters
        WHERE visibility = 'public' AND deleted_at IS NULL AND is_draft = false
        ORDER BY
          CASE status
            WHEN 'active'   THEN 1
            WHEN 'retired'  THEN 2
            WHEN 'deceased' THEN 3
          END,
          name ASC
      `;
  return rows.map((row) => parseCharacter(row));
}

// Ungefiltert — nur für die GM/Admin-Charakterzuweisung (/gm/characters), die
// auch private/gm-Charaktere zuordnen können muss.
export async function getAllCharactersForAdmin(): Promise<Character[]> {
  "use cache";
  cacheTag(cacheTags.characters);
  cacheLife("max");
  const rows = await sql<Character[]>`
      SELECT *
      FROM characters
      WHERE deleted_at IS NULL AND is_draft = false
      ORDER BY
        CASE status
          WHEN 'active'   THEN 1
          WHEN 'retired'  THEN 2
          WHEN 'deceased' THEN 3
        END,
        name ASC
    `;
  return rows.map((row) => parseCharacter(row));
}

export async function getCharacterBySlug(
  slug: string,
): Promise<Character | null> {
  "use cache";
  cacheTag(cacheTags.characters, cacheTags.character(slug));
  cacheLife("max");
  const rows = await sql<Character[]>`
        SELECT *
        FROM characters
        WHERE slug = ${slug} AND deleted_at IS NULL
        LIMIT 1
      `;
  return rows[0] ? parseCharacter(rows[0]) : null;
}

// Charaktere eines Users (siehe assignCharacterToUser). Kein Cache — die
// Dashboard-Route ist durch den Session-Zugriff ohnehin dynamisch, analog
// zu getUserById in src/lib/users.ts.
export async function getCharactersForUser(
  userId: number,
): Promise<Character[]> {
  const rows = await sql<Character[]>`
    SELECT *
    FROM characters
    WHERE player_id = ${userId} AND deleted_at IS NULL
    ORDER BY name ASC
  `;
  // keepStats: die eigene Charakterübersicht (/user/characters) leitet daraus
  // ab, ob für einen Charakter schon Werte gepflegt sind.
  return rows.map((row) => parseCharacter(row, { keepStats: true }));
}

export interface CharacterWithOwner {
  id: number;
  slug: string;
  name: string;
  playerId: number;
  playerName: string;
}

// Alle Charaktere mit Spieler außer denen von excludeUserId — Partner-
// Picker für "Gespräch beginnen" (src/app/user/dialogues/new). Kein
// Cache, gleiche Begründung wie getCharactersForUser.
export async function getCharactersWithPlayers(
  excludeUserId: number,
): Promise<CharacterWithOwner[]> {
  return sql<CharacterWithOwner[]>`
    SELECT c.id, c.slug, c.name, c.player_id AS "playerId", u.name AS "playerName"
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.player_id IS NOT NULL AND c.player_id != ${excludeUserId}
      AND c.deleted_at IS NULL AND c.is_draft = false
    ORDER BY c.name ASC
  `;
}

export interface CharacterParticipantOption {
  id: number;
  slug: string;
  name: string;
  playerName: string;
  status: Character["status"];
}

// Nur Charaktere MIT zugewiesenem Spieler für den Teilnehmer-Multiselect
// beim Anlegen/Bearbeiten einer Mission (MissionParticipantsField.tsx) — ein
// Charakter ohne player_id kann nicht "teilnehmen" im Sinne dieses Features, da
// die ganze Teilnehmer-Benachrichtigung (siehe missionAction,
// missions/_shared/contentAction.ts) auf einen Spieler abzielt, der
// informiert werden kann. status wird mitgeliefert, damit die Auswahl
// standardmäßig nicht mehr aktive Charaktere ausblenden kann (Filterung
// passiert client-seitig in MissionParticipantsField.tsx, nicht hier — alle
// Charaktere werden geladen, damit ein bereits ausgewählter, inzwischen
// inaktiver Teilnehmer beim Bearbeiten nicht unbemerkt aus der Liste fällt).
export async function getCharactersForParticipantPicker(): Promise<
  CharacterParticipantOption[]
> {
  return sql<CharacterParticipantOption[]>`
    SELECT c.id, c.slug, c.name, u.name AS "playerName", c.status
    FROM characters c
    JOIN users u ON u.id = c.player_id
    WHERE c.deleted_at IS NULL AND c.is_draft = false
    ORDER BY c.name ASC
  `;
}

export interface ParticipantCharacterForNotification {
  id: number;
  slug: string;
  name: string;
  playerId: number | null;
  playerSlug: string | null;
  playerName: string | null;
}

// Charakter-Slug/-Name + Spieler-ID/-Slug/-Name für die
// Teilnehmer-Benachrichtigung beim Mission-Anlegen (missionAction,
// missions/_shared/contentAction.ts) — dort werden zusätzlich zum Spieler
// selbst (getMissionParticipantUsers) auch dessen Charakter- und
// User-Abonnenten benachrichtigt, wofür Slug/Name gebraucht werden.
// playerSlug/playerName sind null bei Charakteren ohne zugeordneten Spieler.
export async function getParticipantCharactersForNotification(
  characterIds: number[],
): Promise<ParticipantCharacterForNotification[]> {
  if (characterIds.length === 0) return [];
  return sql<ParticipantCharacterForNotification[]>`
    SELECT c.id, c.slug, c.name, c.player_id AS "playerId",
           u.slug AS "playerSlug", u.name AS "playerName"
    FROM characters c
    LEFT JOIN users u ON u.id = c.player_id
    WHERE c.id = ANY(${characterIds})
  `;
}

// GM-only-Zuweisung (siehe src/app/admin/actions.ts). player_id wird vom
// Ingest nie angefasst (scripts/ingest/characters.ts), Zuweisungen
// überleben also einen Re-Ingest.
export async function assignCharacterToUser(
  characterId: number,
  userId: number | null,
): Promise<Character | null> {
  const rows = await sql<Character[]>`
    UPDATE characters
    SET player_id = ${userId}
    WHERE id = ${characterId}
    RETURNING *
  `;
  if (rows[0]) syncEmbeddingOwner("character", characterId, userId);
  return rows[0] ? parseCharacter(rows[0]) : null;
}

// Entfernt alle Charakter-Zuweisungen eines Users — genutzt, wenn ein User
// auf die Gast-Rolle herabgestuft wird (siehe updateUserRoleAction in
// src/app/admin/actions.ts), da Gästen laut Produktentscheidung kein
// Charakter zugeordnet sein darf.
export async function unassignCharactersFromUser(
  userId: number,
): Promise<void> {
  await sql`
    UPDATE characters SET player_id = NULL WHERE player_id = ${userId}
  `;
  syncCharacterEmbeddingsOwnerCleared(userId);
}

// Nur der Owner (player_id) darf die Sichtbarkeit ändern — ein fremdes/
// gefälschtes id trifft dann einfach 0 Zeilen (gleiches Prinzip wie
// assignCharacterToUser oben).
export async function setCharacterVisibility(
  userId: number,
  characterId: number,
  visibility: "private" | "gm" | "public",
): Promise<{
  slug: string;
  name: string;
  sourceMarkdown: string | null;
} | null> {
  const rows = await sql<
    { slug: string; name: string; sourceMarkdown: string | null }[]
  >`
    UPDATE characters
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId}
    RETURNING slug, name, source_md AS "sourceMarkdown"
  `;
  if (rows[0]) syncEmbeddingVisibility("character", characterId, visibility);
  return rows[0] ?? null;
}

// Admin-Sichtbarkeits-Verwaltung (ActionsMenu.tsx/AdminVisibilitySelect.tsx):
// anders als setCharacterVisibility oben NICHT auf den Owner gescoped (nur
// admin darf das, geprüft in setVisibilityAdminAction) — mirrort
// setOwnerAction/assignCharacterToUser in src/app/actions/owner.ts.
export async function setCharacterVisibilityAdmin(
  characterId: number,
  visibility: "private" | "gm" | "public",
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE characters
    SET visibility = ${visibility}, updated_at = NOW()
    WHERE id = ${characterId}
    RETURNING slug
  `;
  if (rows[0]) syncEmbeddingVisibility("character", characterId, visibility);
  return rows[0] ?? null;
}

export interface UserContentLog {
  id: number;
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  mission_slug: string;
  mission_title: string;
  character_slug: string;
  character_name: string;
  visibility: "private" | "gm" | "public";
  is_draft: boolean;
}

// Alle Mission-Logs der eigenen Charaktere für /user/content. Ungecacht
// wie getCharactersForUser — die Seite ist ohnehin durch requireOwnCharacters
// (Session-Zugriff) dynamisch. Liefert den verfassenden eigenen Charakter
// mit, damit die Seite nach Charakter gruppieren kann.
export async function getLogsForUser(
  userId: number,
): Promise<UserContentLog[]> {
  return sql<UserContentLog[]>`
    SELECT
      ml.id, ml.slug, ml.title, ml.session_nr, ml.log_date::text AS log_date,
      m.slug AS mission_slug, m.title AS mission_title, ml.visibility,
      c.slug AS character_slug, c.name AS character_name, ml.is_draft
    FROM mission_logs ml
    JOIN characters c ON c.id = ml.author_id
    JOIN missions m ON m.id = ml.mission_id
    WHERE c.player_id = ${userId} AND ml.deleted_at IS NULL
    ORDER BY ml.session_nr DESC NULLS LAST
  `;
}

// Nur public-Logs — rendert auf der öffentlichen Charakterseite. Eigene
// private/gm-Logs sieht der Owner weiterhin über "Meine Inhalte"
// (getLogsForUser, unten) bzw. direkt über die (laufzeitgeprüfte)
// Log-Detailseite.
export async function getLogsByCharacter(
  characterId: number,
): Promise<MissionLogPreview[]> {
  "use cache";
  cacheTag(cacheTags.missionLogs);
  cacheLife("max");
  const rows = await sql<MissionLogPreview[]>`
        SELECT
          ml.id,
          ml.slug,
          ml.title,
          ml.session_nr,
          ml.log_date::text AS log_date,
          m.slug            AS mission_slug,
          m.title           AS mission_title
        FROM mission_logs ml
        JOIN missions m ON m.id = ml.mission_id
        WHERE ml.author_id = ${characterId} AND ml.visibility = 'public' AND ml.deleted_at IS NULL
          AND ml.is_draft = false
        ORDER BY ml.session_nr DESC NULLS LAST
      `;
  return rows;
}

// Für die Admin-Action "Autolinking" (src/app/actions/autolink.ts) — braucht
// id + rohen Markdown-Quelltext, unabhängig von Sichtbarkeit/Owner (Admins
// dürfen jeden Charakter autolinken).
export async function getCharacterSourceBySlug(
  slug: string,
): Promise<{ id: number; sourceMarkdown: string | null } | null> {
  const rows = await sql<{ id: number; sourceMarkdown: string | null }[]>`
    SELECT id, source_md AS "sourceMarkdown" FROM characters WHERE slug = ${slug}
  `;
  return rows[0] ?? null;
}

export async function updateCharacterBio(
  characterId: number,
  bodyMarkdown: string,
  bio: string,
  // Wer die Bearbeitung ausgelöst hat — nur für die Versionshistorie. Der
  // Aufrufer (Autolink-Werkzeug) kennt ihn, die Funktion selbst nicht.
  editorId: number | null = null,
): Promise<void> {
  await recordRevision("character", characterId, editorId, bodyMarkdown);
  await sql`
    UPDATE characters
    SET bio = ${bio}, source_md = ${bodyMarkdown}, updated_at = NOW()
    WHERE id = ${characterId}
  `;
  syncEmbeddings("character", characterId);
}

// Probiert slugifyBase(name), "${base}-2", "${base}-3", … bis ein Slug in
// characters frei ist — analog generateUniqueArchiveEntrySlug in
// src/lib/archive.ts, hier für die Selbstanlage eigener Charaktere.
export async function generateUniqueCharacterSlug(
  name: string,
): Promise<string> {
  const base = slugifyBase(name);
  let candidate = base;
  let n = 2;

  for (;;) {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM characters WHERE slug = ${candidate}) AS exists
    `;
    if (!row.exists) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

// Original und Ausschnitt des Portraits für den metadata-Patch.
//
// Beide Felder sind optional: fehlen sie im Eingabeobjekt, taucht der
// Schlüssel gar nicht im Patch auf und der jsonb-||-Merge lässt den
// gespeicherten Wert stehen. Nur so kann ein Weg, der vom Portrait nichts
// weiß, keinen bereits gewählten Ausschnitt löschen.
function portraitMetadata(input: {
  portraitSource?: string | null;
  portraitCrop?: PortraitCrop | null;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.portraitSource !== undefined) {
    patch.portraitSource = input.portraitSource;
  }
  if (input.portraitCrop !== undefined) {
    patch.portraitCrop = input.portraitCrop;
  }
  return patch;
}

// Gemeinsame Ableitung für createCharacter/updateOwnCharacterContent: keine
// der drei Angaben gesetzt → affiliation bleibt null statt eines leeren
// {factions:[],ships:[],division:null}-Objekts (unterscheidet "keine Angabe"
// von "explizit leer" in der UI, siehe char-file.css/CharFile-Rendering).
function buildAffiliation(input: {
  factions: string[];
  ships: string[];
  division: string | null;
}): { factions: string[]; ships: string[]; division: string | null } | null {
  const hasAffiliation =
    input.factions.length > 0 || input.ships.length > 0 || input.division;
  return hasAffiliation
    ? { factions: input.factions, ships: input.ships, division: input.division }
    : null;
}

// Legt einen neuen, eigenen Charakter an (User-Feature: jeder eingeloggte
// User außer Gast-Accounts darf eigene Charaktere anlegen, siehe
// /user/characters/new/actions.ts — die Gast-Sperre lebt dort, weil
// Gäste laut Produktentscheidung keinen Charakter zugewiesen haben dürfen,
// siehe assignCharacterAction in src/app/admin/actions.ts). player_id wird
// direkt auf den anlegenden User gesetzt (sofortige Verknüpfung).
// visibility bleibt unangegeben → DB-Default 'public' (gleiche Konvention
// wie createArchiveEntry/createMission). player (Anzeigename, ingest-only)
// bleibt null — das Formular deckt nur Spieler-relevante Felder ab.
export async function createCharacter(input: {
  name: string;
  status: Character["status"];
  portrait: string | null;
  // Original und Ausschnitt des Portraits (siehe src/lib/portraitCrop.ts).
  portraitSource?: string | null;
  portraitCrop?: PortraitCrop | null;
  rank: string | null;
  species: string[];
  homeworld: string | null;
  aliases: string[];
  age: number | null;
  dateOfBirth?: string | null;
  generation: number[];
  factions: string[];
  ships: string[];
  division: string | null;
  tags: string[];
  bodyMarkdown: string;
  // Wem gehört der Charakter? null = keinem Spieler zugeordnet (NPCs sind
  // KEINE Charaktere, sondern Datenbank-Einträge der Kategorie "npc").
  // Zuordnen lässt er sich später jederzeit unter /gm/characters.
  ownerUserId: number | null;
  // Entwurf statt sofort veröffentlicht (siehe canViewDraft in
  // src/lib/visibility.ts) — bewusst kein Default hier, jeder Aufrufer muss
  // sich explizit entscheiden.
  isDraft: boolean;
  // Vorgerendertes HTML überspringt das eigene renderContentHtml() — genutzt
  // vom Opt-in "Automatisch verlinken", siehe createArchiveEntry in
  // src/lib/archive.ts für dieselbe Begründung.
  bioHtml?: string;
  // Charakterwerte direkt beim Anlegen (Anlege-Assistent, Schritt „Werte") —
  // sie landen im selben INSERT wie die Akte. Getrennt zu speichern hieße,
  // dass ein Fehler dazwischen einen Charakter ohne seine gerade erst
  // eingetragenen Werte hinterlässt.
  stats?: CharacterStats;
}): Promise<{ id: number; slug: string }> {
  const slug = await generateUniqueCharacterSlug(input.name);
  const trimmedBody = input.bodyMarkdown.trim();
  const bio = trimmedBody
    ? (input.bioHtml ?? (await renderContentHtml(trimmedBody)))
    : null;
  const sourceMd = trimmedBody || null;

  const metadata = {
    rank: input.rank,
    species: input.species,
    homeworld: input.homeworld,
    age: input.age,
    dateOfBirth: input.dateOfBirth ?? null,
    affiliation: buildAffiliation(input),
    player: null,
    tags: input.tags,
    aliases: input.aliases,
    generation: input.generation,
    ...portraitMetadata(input),
    ...(input.stats ? { stats: input.stats } : {}),
  };

  const [row] = await sql<{ id: number; slug: string }[]>`
    INSERT INTO characters (
      slug, name, status, player_id, portrait, bio, metadata,
      source_md, frontmatter, is_draft, updated_at
    ) VALUES (
      ${slug}, ${input.name}, ${input.status}, ${input.ownerUserId}, ${input.portrait},
      ${bio}, ${sql.json(metadata as ReturnType<typeof JSON.parse>)}, ${sourceMd},
      ${sql.json({})}, ${input.isDraft}, NOW()
    )
    RETURNING id, slug
  `;
  syncEmbeddings("character", row.id);
  return row;
}

export interface OwnCharacterForEdit {
  id: number;
  slug: string;
  name: string;
  status: Character["status"];
  portrait: string | null;
  // Original und Ausschnitt (siehe src/lib/portraitCrop.ts) — der Editor
  // öffnet damit denselben Zuschnitt wieder, statt ihn neu erfinden zu lassen.
  portraitSource: string | null;
  portraitCrop: unknown;
  rank: string | null;
  species: string[];
  homeworld: string | null;
  aliases: string[];
  age: number | null;
  dateOfBirth: string | null;
  generation: number[];
  factions: string[];
  ships: string[];
  division: string | null;
  tags: string[];
  sourceMarkdown: string;
  // Die bereits gerenderte Biografie (bio) — die eigene Charakterseite zeigt
  // sie im Lesemodus ihres Biografie-Panels an, ohne dafür ein zweites Mal
  // durch die Markdown-Pipeline zu gehen.
  bioHtml: string | null;
  isDraft: boolean;
}

// Für /user/characters/[characterId]/edit — lädt die für das volle
// Bearbeiten-Formular relevanten Felder (Metadaten-Teilmenge, siehe
// createCharacter oben) plus den rohen Markdown-Body. Owner-gescoped wie
// setCharacterVisibility oben — ein fremdes/gefälschtes id trifft dann
// einfach 0 Zeilen. slug wird zusätzlich zurückgegeben, damit das Opt-in
// "Automatisch verlinken" den Charakter selbst als Autolinking-Ziel
// ausschließen kann.
export async function getOwnCharacterForEdit(
  userId: number,
  characterId: number,
): Promise<OwnCharacterForEdit | null> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      name: string;
      status: Character["status"];
      portrait: string | null;
      metadata: CharacterMetadata | string;
      sourceMarkdown: string;
      bioHtml: string | null;
      isDraft: boolean;
    }[]
  >`
    SELECT id, slug, name, status, portrait, metadata, is_draft AS "isDraft",
           bio AS "bioHtml",
           COALESCE(source_md, '') AS "sourceMarkdown"
    FROM characters
    WHERE id = ${characterId} AND player_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const metadata: CharacterMetadata =
    typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    portrait: row.portrait,
    portraitSource: metadata.portraitSource ?? null,
    portraitCrop: metadata.portraitCrop ?? null,
    sourceMarkdown: row.sourceMarkdown,
    bioHtml: row.bioHtml,
    isDraft: row.isDraft,
    rank: metadata.rank,
    species: metadata.species,
    homeworld: metadata.homeworld,
    aliases: metadata.aliases,
    age: metadata.age,
    dateOfBirth: metadata.dateOfBirth ?? null,
    generation: metadata.generation,
    factions: metadata.affiliation?.factions ?? [],
    ships: metadata.affiliation?.ships ?? [],
    division: metadata.affiliation?.division ?? null,
    tags: metadata.tags,
  };
}

// Bearbeitet Name/Status/Portrait/Metadaten/Bio eines eigenen Charakters —
// für das volle Bearbeiten-Formular. Owner-gescoped im WHERE (gleiches
// Prinzip wie updateOwnArchiveEntryContent in src/lib/archive.ts). metadata
// wird per jsonb-||-Merge nur in den hier editierten Feldern überschrieben —
// player (nicht Teil dieses Formulars, admin-only Ingest-Domäne) bleibt
// dadurch unangetastet statt bei jedem Speichern verloren zu gehen.
export async function updateOwnCharacterContent(
  userId: number,
  characterId: number,
  input: {
    name: string;
    status: Character["status"];
    portrait: string | null;
    // Original und Ausschnitt des Portraits (siehe src/lib/portraitCrop.ts).
    // undefined = unverändert lassen; null = löschen.
    portraitSource?: string | null;
    portraitCrop?: PortraitCrop | null;
    rank: string | null;
    species: string[];
    homeworld: string | null;
    aliases: string[];
    age: number | null;
    dateOfBirth?: string | null;
    generation: number[];
    factions: string[];
    ships: string[];
    division: string | null;
    tags: string[];
    bodyMarkdown: string;
    isDraft: boolean;
    // Siehe createCharacter oben — Opt-in "Automatisch verlinken".
    bioHtml?: string;
  },
): Promise<{
  slug: string;
  visibility: "private" | "gm" | "public";
  wasDraft: boolean;
} | null> {
  const trimmedBody = input.bodyMarkdown.trim();
  const bio = trimmedBody
    ? (input.bioHtml ?? (await renderContentHtml(trimmedBody)))
    : null;
  const sourceMd = trimmedBody || null;

  await recordRevision(
    "character",
    characterId,
    userId,
    input.bodyMarkdown.trim() || null,
  );

  const metadataPatch = {
    rank: input.rank,
    species: input.species,
    homeworld: input.homeworld,
    aliases: input.aliases,
    age: input.age,
    dateOfBirth: input.dateOfBirth ?? null,
    generation: input.generation,
    affiliation: buildAffiliation(input),
    tags: input.tags,
    ...portraitMetadata(input),
  };

  // "wasDraft" (Stand VOR diesem Update) per CTE mitgeliefert — der
  // Aufrufer (contentAction.ts) braucht ihn, um einen Entwurf→Veröffentlicht-
  // Übergang von einer normalen Bearbeitung zu unterscheiden (siehe
  // canViewDraft-Kommentar).
  const rows = await sql<
    {
      slug: string;
      visibility: "private" | "gm" | "public";
      wasDraft: boolean;
    }[]
  >`
    WITH old AS (SELECT is_draft FROM characters WHERE id = ${characterId})
    UPDATE characters
    SET name = ${input.name}, status = ${input.status}, portrait = ${input.portrait},
        metadata = metadata || ${sql.json(metadataPatch as ReturnType<typeof JSON.parse>)},
        bio = ${bio}, source_md = ${sourceMd}, is_draft = ${input.isDraft},
        updated_at = NOW()
    FROM old
    WHERE id = ${characterId} AND player_id = ${userId}
    RETURNING slug, visibility, old.is_draft AS "wasDraft"
  `;
  if (rows[0]) syncEmbeddings("character", characterId);
  return rows[0] ?? null;
}

// ── Charakterwerte (metadata.stats, siehe src/lib/characterStats.ts) ──────
//
// Eigene Lese-/Schreibfunktionen statt einer Erweiterung von
// getOwnCharacterForEdit/updateOwnCharacterContent: die Werte werden in einem
// eigenen Formular (/user/characters/[id]/stats) gepflegt, und beide Wege
// schreiben per jsonb-||-Merge nur ihren eigenen Teilbaum — das Kopf-Formular
// kann die Werte damit nicht überschreiben und umgekehrt.

export interface OwnCharacterStats {
  id: number;
  slug: string;
  name: string;
  // Das Portrait ist zugleich das „Photo" des Charakterbogens — der Bogen
  // zeigt es an und lädt es hoch,
  // statt ein zweites Bild neben dem Portrait zu führen.
  portrait: string | null;
  // Spezies der Akte — die Talent-Auswahl prüft damit Voraussetzungen wie
  // „Vulcan" (siehe talentRequirements.ts).
  species: string | null;
  // Rang der Akte — steht auf dem Bogen, wird aber dort nicht bearbeitet.
  rank: string | null;
  stats: CharacterStats;
}

// Owner-gescoped wie getOwnCharacterForEdit — eine fremde/gefälschte id
// trifft 0 Zeilen und liefert null.
export async function getOwnCharacterStats(
  userId: number,
  characterId: number,
): Promise<OwnCharacterStats | null> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      name: string;
      portrait: string | null;
      species: string | null;
      rank: string | null;
      stats: unknown;
    }[]
  >`
    SELECT id, slug, name, portrait,
           -- Rang und Spezies pflegt die App in metadata (siehe
           -- createCharacter/updateOwnCharacterContent); die gleichnamigen
           -- Spalten stammen aus dem Vault-Ingest und bleiben bei einem in der
           -- App angelegten Charakter leer. Erst metadata, dann die Spalte:
           -- sonst stünde auf dem Bogen nichts, obwohl beides gepflegt ist.
           COALESCE(NULLIF(metadata ->> 'rank', ''), rank) AS rank,
           COALESCE(
             NULLIF(
               (SELECT string_agg(value, ', ')
                FROM jsonb_array_elements_text(
                  CASE WHEN jsonb_typeof(metadata -> 'species') = 'array'
                       THEN metadata -> 'species' ELSE '[]'::jsonb END
                ) AS value),
               ''
             ),
             species
           ) AS species,
           metadata -> 'stats' AS stats
    FROM characters
    WHERE id = ${characterId} AND player_id = ${userId} AND deleted_at IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    portrait: row.portrait,
    species: row.species,
    rank: row.rank,
    // metadata->'stats' kommt je nach Treiber als Objekt ODER als JSON-String
    // an (wie metadata selbst, siehe parseCharacter oben).
    stats: parseCharacterStats(
      typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
    ),
  };
}

// Dieselben Werte ohne Owner-Bindung — ausschließlich für die Spielleitung
// (der Aufrufer MUSS gm.access geprüft haben, siehe /characters/[slug]/sheet
// und die PDF-Route). Getrennt von getOwnCharacterStats, damit an jeder
// Aufrufstelle sichtbar bleibt, welche der beiden Abfragen die Berechtigung
// selbst mitbringt und welche sie voraussetzt.
export async function getCharacterStatsForGm(
  characterId: number,
): Promise<OwnCharacterStats | null> {
  const rows = await sql<
    {
      id: number;
      slug: string;
      name: string;
      portrait: string | null;
      species: string | null;
      rank: string | null;
      stats: unknown;
    }[]
  >`
    SELECT id, slug, name, portrait,
           -- Rang und Spezies pflegt die App in metadata (siehe
           -- createCharacter/updateOwnCharacterContent); die gleichnamigen
           -- Spalten stammen aus dem Vault-Ingest und bleiben bei einem in der
           -- App angelegten Charakter leer. Erst metadata, dann die Spalte:
           -- sonst stünde auf dem Bogen nichts, obwohl beides gepflegt ist.
           COALESCE(NULLIF(metadata ->> 'rank', ''), rank) AS rank,
           COALESCE(
             NULLIF(
               (SELECT string_agg(value, ', ')
                FROM jsonb_array_elements_text(
                  CASE WHEN jsonb_typeof(metadata -> 'species') = 'array'
                       THEN metadata -> 'species' ELSE '[]'::jsonb END
                ) AS value),
               ''
             ),
             species
           ) AS species,
           metadata -> 'stats' AS stats
    FROM characters
    WHERE id = ${characterId} AND deleted_at IS NULL
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    portrait: row.portrait,
    species: row.species,
    rank: row.rank,
    stats: parseCharacterStats(
      typeof row.stats === "string" ? JSON.parse(row.stats) : row.stats,
    ),
  };
}

// Schreibt ausschließlich metadata.stats (jsonb-Merge auf oberster Ebene) —
// Rang/Spezies/Alter & Co. im selben metadata-Objekt bleiben unangetastet.
// Owner-gescoped im WHERE wie updateOwnCharacterContent.
export async function updateOwnCharacterStats(
  userId: number,
  characterId: number,
  stats: CharacterStats,
): Promise<{ slug: string; name: string } | null> {
  const rows = await sql<{ slug: string; name: string }[]>`
    UPDATE characters
    SET metadata = metadata || ${sql.json({ stats } as ReturnType<typeof JSON.parse>)},
        updated_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId} AND deleted_at IS NULL
    RETURNING slug, name
  `;
  return rows[0] ?? null;
}

// Der Markdown-Quelltext der Biografie — für das dritte Blatt des
// PDF-Exports. Bewusst OHNE Owner-Scoping wie getCharacterStatsForGm: die
// Route prüft die Berechtigung bereits (Owner oder gm.access), und die
// Spielleitung zieht den Bogen jedes Charakters.
export async function getCharacterBioMarkdown(
  characterId: number,
): Promise<string | null> {
  const rows = await sql<{ sourceMd: string | null }[]>`
    SELECT source_md AS "sourceMd" FROM characters
    WHERE id = ${characterId} AND deleted_at IS NULL
    LIMIT 1
  `;
  return rows[0]?.sourceMd ?? null;
}

// Für die Header-Navigation (/api/session → HeaderUserNav): zeigt den
// „Charaktere"-Menüpunkt nur Usern mit mindestens einem verknüpften
// Charakter. Bewusst EXISTS statt getCharactersForUser — der Endpunkt läuft
// bei jedem Seitenaufruf und braucht nur ja/nein, keine Datensätze. Nicht
// gecacht (session-abhängig, muss sofort nach dem Anlegen/Zuweisen greifen).
export async function userHasCharacters(userId: number): Promise<boolean> {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM characters
      WHERE player_id = ${userId} AND deleted_at IS NULL
    ) AS exists
  `;
  return row?.exists ?? false;
}

// Benachrichtigt alle Abonnenten eines Charakters (content_follows,
// target_type 'character'), dass sich etwas an der Akte geändert hat —
// gerufen von beiden Bearbeiten-Wegen (volles Formular:
// characters/_shared/contentAction.ts; Inline-Bio-Editor:
// app/actions/characters.ts#updateOwnCharacterBioAction), jeweils NACH dem
// erfolgreichen Speichern. Best-effort wie die Dialog-Benachrichtigungen in
// app/actions/dialogues.ts: einzelne fehlgeschlagene Mails werden geloggt,
// brechen den Rest nicht ab. editingUserId schließt den Bearbeitenden selbst
// aus — er ist immer der Owner (beide Editier-Wege sind owner-only, siehe
// CharacterBioEditor.tsx/EditCharacterForm.tsx), braucht also keine
// Benachrichtigung über die eigene Änderung.
export async function notifyCharacterSubscribers(input: {
  characterSlug: string;
  characterName: string;
  editingUserId: number;
  // Roher Bio-Markdown nach der Änderung — die Vorschau wird hier zentral
  // daraus abgeleitet, statt an jeder Aufrufstelle einzeln zu kürzen.
  bioMarkdown: string | null;
}): Promise<void> {
  const subscribers = (
    await getCharacterSubscribers(input.characterSlug)
  ).filter((s) => s.id !== input.editingUserId);
  if (subscribers.length === 0) return;

  const preview = input.bioMarkdown
    ? synopsisExcerpt(input.bioMarkdown, 140)
    : "Die Akte wurde aktualisiert.";
  const characterUrl = `${await getBaseUrl()}/characters/${input.characterSlug}`;
  // Parallel statt sequenziell — siehe gleicher Kommentar bei
  // notifyMissionSubscribers in missions.ts.
  await Promise.allSettled(
    subscribers.map(async (subscriber) => {
      if (subscriber.emailNotificationsEnabled) {
        const result = await sendCharacterUpdatedEmail({
          to: subscriber.email,
          name: subscriber.name,
          characterName: input.characterName,
          characterUrl,
          preview,
        });
        if (!result.sent) {
          const message = `Charakter-Update-Mail an ${subscriber.email} fehlgeschlagen: ${result.error}`;
          console.error(message);
          void logCaughtError(
            new Error(message),
            "characters.ts:notifyCharacterSubscribers",
          );
        }
      }
      if (subscriber.pushNotificationsEnabled) {
        await sendPushToUser(subscriber.id, {
          title: `Aktualisiert: ${input.characterName}`,
          body: preview,
          url: characterUrl,
        });
      }
    }),
  );
}

// Nur die Biografie, nicht Name/Status/Metadaten — für den Inline-Editor auf
// der Detailseite (CharacterBioEditor.tsx), analog updateOwnArchiveEntryBody
// in src/lib/archive.ts. Anders als dort darf der Text leer sein (ein
// Charakter ohne Bio ist ein normaler Zustand, siehe die "Keine
// biografischen Daten"-Leerdarstellung in CharacterHero.tsx) — bio/source_md
// werden dann auf null gesetzt statt einen leeren String zu speichern.
export async function updateOwnCharacterBio(
  userId: number,
  characterId: number,
  bodyMarkdown: string,
  // Siehe createCharacter oben — Opt-in "Automatisch verlinken".
  bioHtmlOverride?: string,
): Promise<{ slug: string; name: string; bio: string | null } | null> {
  await recordRevision(
    "character",
    characterId,
    userId,
    bodyMarkdown.trim() || null,
  );

  const trimmedBody = bodyMarkdown.trim();
  const bio = trimmedBody
    ? (bioHtmlOverride ?? (await renderContentHtml(trimmedBody)))
    : null;
  const sourceMd = trimmedBody || null;

  const rows = await sql<{ slug: string; name: string }[]>`
    UPDATE characters
    SET bio = ${bio}, source_md = ${sourceMd}, updated_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId}
    RETURNING slug, name
  `;
  const row = rows[0];
  if (row) syncEmbeddings("character", characterId);
  return row ? { slug: row.slug, name: row.name, bio } : null;
}

// Alle belegten Farben (character_color IS NOT NULL) samt zugehöriger
// Charakter-ID — Grundlage für die „in Benutzung"-Sperre im Farbwähler. Der
// Aufrufer filtert je Charakter dessen eigene Farbe heraus (siehe
// takenColorsForCharacter in src/lib/characterColor.ts); der partielle
// UNIQUE-Index (scripts/schema.sql) erzwingt die Eindeutigkeit zusätzlich auf
// DB-Ebene.
//
// Liefert bewusst die GESAMTE Liste statt einer Variante mit
// `WHERE id != <einer>`: Das Profil braucht sie einmal pro eigenem Charakter,
// was mit der früheren Ein-Charakter-Variante N vollständige Scans der
// characters-Tabelle für praktisch dieselben Daten bedeutete.
export async function getUsedCharacterColorsWithIds(): Promise<
  { id: number; color: string }[]
> {
  const rows = await sql<{ id: number; character_color: string }[]>`
    SELECT id, character_color FROM characters
    WHERE character_color IS NOT NULL
  `;
  return rows.map((r) => ({ id: r.id, color: r.character_color }));
}

// Wirft ColorTakenError, wenn die Farbe bereits von einem anderen Charakter
// belegt ist (partieller UNIQUE-Index → Unique-Violation).
export class ColorTakenError extends Error {}

// Owner-Scoping wie updateOwnCharacterBio (WHERE id = characterId AND
// player_id = userId statt eines separaten Zugriffs-Checks) — eine leere
// RETURNING-Liste bedeutet entweder "Charakter existiert nicht" oder "gehört
// nicht diesem User", beides meldet der Aufrufer als generischen Fehler.
// Liefert bei Erfolg den Slug zurück (für revalidateCharacter beim Aufrufer).
export async function updateCharacterColorPreference(
  characterId: number,
  userId: number,
  color: string,
): Promise<string | null> {
  try {
    const rows = await sql<{ slug: string }[]>`
      UPDATE characters SET character_color = ${color}
      WHERE id = ${characterId} AND player_id = ${userId}
      RETURNING slug
    `;
    return rows[0]?.slug ?? null;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ColorTakenError("Diese Farbe ist bereits vergeben.");
    }
    throw err;
  }
}

// Löscht einen Charakter weich (deleted_at gesetzt statt DELETE) — bleibt in
// der DB, verschwindet aber aus allen Listen/der Suche/der Timeline für
// alle außer Admins (siehe getAllContentForAdmin/Trash-Ansicht in
// lib/adminContent.ts) und wird nach 7 Tagen vom Purge-Cronjob endgültig
// entfernt. Admin-only (kein Owner-Scoping wie bei
// updateOwnCharacterContent) — für die Selbstlöschung durch die spielende
// Person selbst siehe deleteOwnCharacter unten. deletedByUserId dient nur
// dem Löschprotokoll (content_deletions, siehe getRecentDeletions in
// recentActivity.ts).
export async function deleteCharacter(
  characterId: number,
  deletedByUserId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<
    {
      slug: string;
      name: string;
      visibility: string;
      ownerUserId: number | null;
      isDraft: boolean;
    }[]
  >`
    UPDATE characters
    SET deleted_at = NOW()
    WHERE id = ${characterId} AND deleted_at IS NULL
    RETURNING slug, name, visibility, player_id AS "ownerUserId", is_draft AS "isDraft"
  `;
  const row = rows[0] ?? null;
  if (row) syncEmbeddingActive("character", characterId, false);
  // Ein Entwurf war für niemanden außer dem Owner sichtbar — sein Löschen
  // darf deshalb nicht im "gelöscht"-News-Feed auftauchen (der Titel wäre
  // sonst die erste Info, die überhaupt irgendjemand außer dem Owner von
  // diesem Entwurf erfährt).
  if (row && !row.isDraft) {
    await sql`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('character', ${row.name}, ${row.visibility}, ${row.ownerUserId}, ${deletedByUserId})
    `;
  }
  return row ? { slug: row.slug } : null;
}

// Selbstlöschung durch die spielende Person (Meine Inhalte) — Ownership per
// player_id direkt im WHERE erzwungen statt per Vorab-Check, gleiches
// Prinzip wie deleteMissionLog in missions.ts. Kein Admin-Bypass (auch ein
// Admin muss für fremde Charaktere weiterhin deleteCharacter/requireAdmin
// benutzen) — bewusst strikt, analog zu updateOwnCharacterContent.
export async function deleteOwnCharacter(
  userId: number,
  characterId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<
    {
      slug: string;
      name: string;
      visibility: string;
      isDraft: boolean;
    }[]
  >`
    UPDATE characters
    SET deleted_at = NOW()
    WHERE id = ${characterId} AND player_id = ${userId} AND deleted_at IS NULL
    RETURNING slug, name, visibility, is_draft AS "isDraft"
  `;
  const row = rows[0] ?? null;
  if (row) syncEmbeddingActive("character", characterId, false);
  if (row && !row.isDraft) {
    await sql`
      INSERT INTO content_deletions (target_type, title, visibility, owner_user_id, deleted_by)
      VALUES ('character', ${row.name}, ${row.visibility}, ${userId}, ${userId})
    `;
  }
  return row ? { slug: row.slug } : null;
}

// Macht einen weich gelöschten Charakter wieder sichtbar (Admin-Trash-Ansicht).
export async function restoreCharacter(
  characterId: number,
): Promise<{ slug: string } | null> {
  const rows = await sql<{ slug: string }[]>`
    UPDATE characters SET deleted_at = NULL
    WHERE id = ${characterId} AND deleted_at IS NOT NULL
    RETURNING slug
  `;
  if (rows[0]) syncEmbeddingActive("character", characterId, true);
  return rows[0] ?? null;
}

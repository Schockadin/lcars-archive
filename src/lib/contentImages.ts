// Bild-Uploads für Charaktere/Missionen/Missionslogs/Archiv-Einträge (nicht
// Dialoge, siehe Kommentar über content_images in scripts/schema.sql). DB
// (content_images) hält nur Metadaten, die eigentlichen Bytes liegen im
// selben R2-Bucket wie die DB-Backups unter dem Präfix CONTENT_IMAGE_PREFIX
// (src/lib/r2Backup.ts) — beide Seiten werden hier zusammen orchestriert,
// damit ein DB-Eintrag nie ohne zugehöriges R2-Objekt existiert (oder
// umgekehrt).
import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";
import { uploadObjectToR2, getObjectBytesFromR2, deleteObjectFromR2 } from "@/lib/r2Backup";
import {
  canView,
  viewerHasPermission,
  type Viewer,
  type Visibility,
} from "@/lib/visibility";

export const CONTENT_IMAGE_PREFIX = "content-images/";

export const CONTENT_IMAGE_TYPES = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
] as const;
export type ContentImageType = (typeof CONTENT_IMAGE_TYPES)[number];

export function isContentImageType(value: string): value is ContentImageType {
  return (CONTENT_IMAGE_TYPES as readonly string[]).includes(value);
}

// image/jpeg statt .jpg im Key, damit sich der Dateityp aus dem MIME-Type
// statt aus einer vom Client mitgeschickten (und damit fälschbaren)
// Dateiendung ableitet.
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const MAX_CONTENT_IMAGE_BYTES = 5 * 1024 * 1024;

export class InvalidContentImageError extends Error {}

export interface ContentImage {
  id: number;
  contentType: ContentImageType;
  contentId: number;
  contentMime: string;
  sizeBytes: number;
  uploadedBy: number | null;
  createdAt: string;
}

interface ContentImageRow {
  id: number;
  content_type: ContentImageType;
  content_id: number;
  r2_key: string;
  content_mime: string;
  size_bytes: number;
  uploaded_by: number | null;
  created_at: string;
}

function mapRow(row: ContentImageRow): ContentImage {
  return {
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    contentMime: row.content_mime,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export interface ContentAccessContext {
  visibility: Visibility;
  ownerId: number | null;
}

// Owner-/Sichtbarkeits-Kontext des Inhalts, für den ein Bild hochgeladen
// werden soll — dieselbe Quelle für die View-Berechtigung des Bild-Proxys
// (canView, wie contentExport.ts) und die Upload/Lösch-Berechtigung
// (canManageContentImages unten). Direktes SQL statt einer der bestehenden
// getXBySlug-Funktionen: die brauchen einen Slug statt einer ID und liefern
// pro Typ unterschiedliche Shapes — hier reicht eine schlanke, einheitliche
// Projektion für alle vier Typen.
export async function getContentAccessContext(
  contentType: ContentImageType,
  contentId: number,
): Promise<ContentAccessContext | null> {
  if (contentType === "character") {
    const [row] = await sql<{ visibility: Visibility; player_id: number | null }[]>`
      SELECT visibility, player_id FROM characters
      WHERE id = ${contentId} AND deleted_at IS NULL
    `;
    return row ? { visibility: row.visibility, ownerId: row.player_id } : null;
  }
  if (contentType === "mission") {
    // Missionen haben keine eigene Sichtbarkeits-Sperre (immer öffentlich
    // lesbar, siehe contentExport.ts/loadMissionExport).
    const [row] = await sql<{ id: number; owner_user_id: number | null }[]>`
      SELECT id, owner_user_id FROM missions WHERE id = ${contentId} AND deleted_at IS NULL
    `;
    return row ? { visibility: "public", ownerId: row.owner_user_id } : null;
  }
  if (contentType === "mission_log") {
    const [row] = await sql<{ visibility: Visibility; owner_user_id: number | null }[]>`
      SELECT visibility, owner_user_id FROM mission_logs
      WHERE id = ${contentId} AND deleted_at IS NULL
    `;
    return row ? { visibility: row.visibility, ownerId: row.owner_user_id } : null;
  }
  const [row] = await sql<{ visibility: Visibility; owner_user_id: number | null }[]>`
    SELECT visibility, owner_user_id FROM archive_entries
    WHERE id = ${contentId} AND deleted_at IS NULL AND category != 'dialogue'
  `;
  return row ? { visibility: row.visibility, ownerId: row.owner_user_id } : null;
}

// Wer darf Bilder für diesen Inhalt hochladen/löschen? Spiegelt exakt die
// Bearbeiten-Button-Freigabe in ActionsMenu.tsx: bei Charakter/Missionslog
// nur der Owner selbst (kein Moderations-Bypass, gleiche Owner-only-Logik wie
// updateOwnCharacterBio/updateOwnMissionLogAction), bei Mission/Archiv-
// Eintrag zusätzlich, wer fremde Inhalte moderieren darf (content.moderate —
// dasselbe Recht, das auch die Bild-Actions serverseitig fordern, siehe
// requirePermission("content.moderate") in admin/content/images/actions.ts).
// Bewusst rechte- statt rollenbasiert, damit ein Multi-Rollen-User bzw. ein
// per Override/eigener Rolle Berechtigter dieselbe Freigabe bekommt wie über
// das Server-Gate (früher hart auf role === "admin" geprüft).
export function canManageContentImages(
  contentType: ContentImageType,
  ownerId: number | null,
  viewer: Viewer | null,
): boolean {
  if (!viewer) return false;
  if (ownerId != null && viewer.userId === ownerId) return true;
  return (
    viewerHasPermission(viewer, "content.moderate") &&
    (contentType === "mission" || contentType === "archive_entry")
  );
}

function buildContentImageKey(
  contentType: ContentImageType,
  contentId: number,
  extension: string,
): string {
  return `${CONTENT_IMAGE_PREFIX}${contentType}/${contentId}/${crypto.randomUUID()}.${extension}`;
}

export async function listContentImages(
  contentType: ContentImageType,
  contentId: number,
): Promise<ContentImage[]> {
  const rows = await sql<ContentImageRow[]>`
    SELECT id, content_type, content_id, r2_key, content_mime, size_bytes, uploaded_by, created_at
    FROM content_images
    WHERE content_type = ${contentType} AND content_id = ${contentId}
    ORDER BY created_at ASC
  `;
  return rows.map(mapRow);
}

export async function getContentImageById(id: number): Promise<ContentImage | null> {
  const [row] = await sql<ContentImageRow[]>`
    SELECT id, content_type, content_id, r2_key, content_mime, size_bytes, uploaded_by, created_at
    FROM content_images WHERE id = ${id}
  `;
  return row ? mapRow(row) : null;
}

// Lädt die Bytes für eine Bild-Zeile — vom Proxy-Route (src/app/api/
// content-images/[id]/route.ts) genutzt, der r2_key selbst nie an den
// Client weitergibt (Bucket-Struktur bleibt intern).
export async function getContentImageBytes(
  id: number,
): Promise<{ body: Buffer; contentType: string } | null> {
  const [row] = await sql<{ r2_key: string; content_mime: string }[]>`
    SELECT r2_key, content_mime FROM content_images WHERE id = ${id}
  `;
  if (!row) return null;
  const object = await getObjectBytesFromR2(row.r2_key);
  if (!object) return null;
  return { body: object.body, contentType: row.content_mime };
}

export async function uploadContentImage(
  contentType: ContentImageType,
  contentId: number,
  file: { buffer: Buffer; mimeType: string },
  uploadedByUserId: number,
): Promise<ContentImage> {
  const extension = ALLOWED_MIME_TO_EXT[file.mimeType];
  if (!extension) {
    throw new InvalidContentImageError(`Nicht unterstützter Bildtyp: "${file.mimeType}"`);
  }
  if (file.buffer.byteLength === 0) {
    throw new InvalidContentImageError("Die Datei ist leer.");
  }
  if (file.buffer.byteLength > MAX_CONTENT_IMAGE_BYTES) {
    throw new InvalidContentImageError(
      `Die Datei ist zu groß (max. ${MAX_CONTENT_IMAGE_BYTES / (1024 * 1024)} MB).`,
    );
  }

  const key = buildContentImageKey(contentType, contentId, extension);
  await uploadObjectToR2(key, file.buffer, file.mimeType);

  const [row] = await sql<ContentImageRow[]>`
    INSERT INTO content_images
      (content_type, content_id, r2_key, content_mime, size_bytes, uploaded_by)
    VALUES (${contentType}, ${contentId}, ${key}, ${file.mimeType}, ${file.buffer.byteLength}, ${uploadedByUserId})
    RETURNING id, content_type, content_id, r2_key, content_mime, size_bytes, uploaded_by, created_at
  `;
  return mapRow(row);
}

// Löscht sowohl die DB-Zeile als auch das R2-Objekt. contentType/contentId
// sind Teil der WHERE-Bedingung (nicht nur id) — der Aufrufer (Server
// Action) hat die Berechtigung nur für GENAU diesen Inhalt geprüft
// (requireContentImageAccess), ohne diese Einschränkung könnte eine Person
// mit Bearbeitungsrechten für Inhalt A per fremder imageId ein Bild von
// Inhalt B löschen. Gibt false zurück statt zu werfen, wenn die
// ID/Zuordnung nicht (mehr) existiert.
export async function deleteContentImage(
  contentType: ContentImageType,
  contentId: number,
  id: number,
): Promise<boolean> {
  const [row] = await sql<{ r2_key: string }[]>`
    DELETE FROM content_images
    WHERE id = ${id} AND content_type = ${contentType} AND content_id = ${contentId}
    RETURNING r2_key
  `;
  if (!row) return false;
  await deleteObjectFromR2(row.r2_key);
  return true;
}

// Entfernt alle Bilder eines Inhalts inkl. R2-Objekten — von purgeContent.ts
// beim endgültigen Löschen eines Inhalts aufgerufen. content_images hat
// keine Fremdschlüssel-Beziehung zu den vier Inhaltstabellen (polymorph
// über content_type/content_id), ein DELETE der Ursprungszeile räumt Bilder
// deshalb nicht automatisch mit auf — ohne diesen Aufruf blieben sowohl die
// DB-Zeilen als auch die R2-Objekte für immer verwaist liegen.
export async function purgeContentImagesFor(
  contentType: ContentImageType,
  contentId: number,
): Promise<void> {
  const rows = await sql<{ r2_key: string }[]>`
    DELETE FROM content_images
    WHERE content_type = ${contentType} AND content_id = ${contentId}
    RETURNING r2_key
  `;
  for (const row of rows) {
    await deleteObjectFromR2(row.r2_key);
  }
}

// Admin-only Löschen ohne Content-Scoping (siehe Kommentar über
// deleteContentImage oben) — für /admin/content/images, wo ein Admin
// gezielt jedes Bild löschen darf, auch ohne die zugehörige Inhalts-ID zu
// kennen (z.B. bei verwaisten Bildern, deren Inhalt bereits entfernt
// wurde). Der Aufrufer (deleteContentImageAdminAction) prüft die
// Admin-Rolle bereits selbst.
export async function deleteContentImageAsAdmin(id: number): Promise<boolean> {
  const [row] = await sql<{ r2_key: string }[]>`
    DELETE FROM content_images WHERE id = ${id} RETURNING r2_key
  `;
  if (!row) return false;
  await deleteObjectFromR2(row.r2_key);
  return true;
}

export interface AdminContentImage extends ContentImage {
  // null, wenn der zugehörige Inhalt inzwischen (hart) gelöscht/purged wurde
  // — content_images hat keine Fremdschlüssel-Beziehung zu den vier
  // Inhaltstabellen (polymorph über content_type), ein solches Bild bleibt
  // deshalb ohne automatisches Aufräumen bestehen. purgeContent.ts räumt
  // das inzwischen mit auf; ältere, bereits verwaiste Zeilen (vor diesem
  // Fix) tauchen hier trotzdem noch auf, damit ein Admin sie manuell
  // löschen kann.
  contentTitle: string | null;
  contentHref: string | null;
  uploadedByName: string | null;
}

interface AdminContentImageRow extends ContentImageRow {
  content_title: string | null;
  content_href: string | null;
  uploaded_by_name: string | null;
}

// Für /admin/content/images (Bucket-Übersicht über alle vier Inhaltstypen
// hinweg) — LEFT JOIN statt JOIN, damit auch Bilder zu bereits gelöschtem
// Inhalt sichtbar bleiben (siehe AdminContentImage-Kommentar oben).
export async function getAllContentImagesForAdmin(): Promise<AdminContentImage[]> {
  const rows = await sql<AdminContentImageRow[]>`
    SELECT ci.id, ci.content_type, ci.content_id, ci.r2_key, ci.content_mime,
           ci.size_bytes, ci.uploaded_by, ci.created_at,
           c.name AS content_title, ('/characters/' || c.slug) AS content_href,
           u.name AS uploaded_by_name
    FROM content_images ci
    LEFT JOIN characters c ON c.id = ci.content_id AND ci.content_type = 'character'
    LEFT JOIN users u ON u.id = ci.uploaded_by
    WHERE ci.content_type = 'character'

    UNION ALL

    SELECT ci.id, ci.content_type, ci.content_id, ci.r2_key, ci.content_mime,
           ci.size_bytes, ci.uploaded_by, ci.created_at,
           m.title, ('/missions/' || m.slug),
           u.name
    FROM content_images ci
    LEFT JOIN missions m ON m.id = ci.content_id AND ci.content_type = 'mission'
    LEFT JOIN users u ON u.id = ci.uploaded_by
    WHERE ci.content_type = 'mission'

    UNION ALL

    SELECT ci.id, ci.content_type, ci.content_id, ci.r2_key, ci.content_mime,
           ci.size_bytes, ci.uploaded_by, ci.created_at,
           ml.title, ('/missions/' || mi.slug || '/' || ml.slug),
           u.name
    FROM content_images ci
    LEFT JOIN mission_logs ml ON ml.id = ci.content_id AND ci.content_type = 'mission_log'
    LEFT JOIN missions mi ON mi.id = ml.mission_id
    LEFT JOIN users u ON u.id = ci.uploaded_by
    WHERE ci.content_type = 'mission_log'

    UNION ALL

    SELECT ci.id, ci.content_type, ci.content_id, ci.r2_key, ci.content_mime,
           ci.size_bytes, ci.uploaded_by, ci.created_at,
           a.title, ('/archive/' || a.slug),
           u.name
    FROM content_images ci
    LEFT JOIN archive_entries a ON a.id = ci.content_id AND ci.content_type = 'archive_entry'
    LEFT JOIN users u ON u.id = ci.uploaded_by
    WHERE ci.content_type = 'archive_entry'

    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    ...mapRow(row),
    contentTitle: row.content_title,
    contentHref: row.content_href,
    uploadedByName: row.uploaded_by_name,
  }));
}

// Setzt characters.portrait auf die Serving-URL eines bereits hochgeladenen
// Bildes dieses Charakters — validiert dabei, dass das Bild wirklich zu
// diesem Charakter gehört (gleiche Content-Scoping-Überlegung wie
// deleteContentImage). Bewusst kein Rollback des vorherigen portrait-Werts:
// bei einer Vault-importierten externen Portrait-URL geht dieser Wert damit
// verloren, das ist beabsichtigt (das eigene Bild soll ab jetzt die Quelle
// sein).
// Gibt den Charakter-Slug zurück (für revalidateCharacter beim Aufrufer,
// src/app/actions/contentImages.ts) statt nur eines Booleans.
export async function setCharacterPortraitFromImage(
  characterId: number,
  imageId: number,
): Promise<string | null> {
  const [image] = await sql<{ id: number }[]>`
    SELECT id FROM content_images
    WHERE id = ${imageId} AND content_type = 'character' AND content_id = ${characterId}
  `;
  if (!image) return null;

  const [character] = await sql<{ slug: string }[]>`
    UPDATE characters SET portrait = ${`/api/content-images/${imageId}`}, updated_at = NOW()
    WHERE id = ${characterId}
    RETURNING slug
  `;
  return character?.slug ?? null;
}

export { canView };

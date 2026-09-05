import "server-only";
import sql from "@/lib/db";
import type { Viewer } from "@/lib/visibility";
import { viewerHasPermission } from "@/lib/visibility";
import {
  REVISION_KEEP,
  revisionExcerpt,
  type ContentRevision,
  type RevisionContentType,
} from "@/lib/contentRevisionTypes";

// Versionshistorie der Inhaltstexte (siehe content_revisions in schema.sql).
//
// Vor jedem Überschreiben des Textes wird der BISHERIGE Stand weggeschrieben.
// Eine Fassung ist damit immer „so sah es vor dieser Bearbeitung aus" — genau
// das, was man zum Zurückholen braucht. Aufgehoben werden die letzten
// REVISION_KEEP Fassungen je Inhalt.
//
// Bewusst nur Titel + Quelltext (source_md), nicht die gerenderte Fassung
// oder die Metadaten: das gerenderte HTML wird beim Wiederherstellen ohnehin
// neu erzeugt, und Metadaten (Status, Tags, Sichtbarkeit) sind Stammdaten mit
// eigenen Formularen, kein Fließtext, den man „verschreiben" kann.

export {
  REVISION_CONTENT_TYPES,
  REVISION_KEEP,
  REVISION_EXCERPT_LENGTH,
  isRevisionContentType,
  revisionExcerpt,
} from "@/lib/contentRevisionTypes";
export type {
  RevisionContentType,
  ContentRevision,
} from "@/lib/contentRevisionTypes";

// Tabelle und Owner-Spalte je Inhaltsart. Vier Tabellen, aber überall
// dieselben zwei Felder (Titel/Name + source_md) — die Abfragen unterscheiden
// sich nur in den Bezeichnern, deshalb eine Tabelle statt vier Zweigen.
const SOURCES: Record<
  RevisionContentType,
  { table: string; titleColumn: string; ownerColumn: string }
> = {
  character: { table: "characters", titleColumn: "name", ownerColumn: "player_id" },
  mission: { table: "missions", titleColumn: "title", ownerColumn: "owner_user_id" },
  mission_log: { table: "mission_logs", titleColumn: "title", ownerColumn: "owner_user_id" },
  archive: { table: "archive_entries", titleColumn: "title", ownerColumn: "owner_user_id" },
};

interface CurrentRow {
  title: string | null;
  source_md: string | null;
  owner_id: number | null;
}

async function currentRow(
  contentType: RevisionContentType,
  contentId: number,
): Promise<CurrentRow | null> {
  const src = SOURCES[contentType];
  const rows = await sql<CurrentRow[]>`
    SELECT ${sql(src.titleColumn)} AS title,
           source_md,
           ${sql(src.ownerColumn)} AS owner_id
    FROM ${sql(src.table)}
    WHERE id = ${contentId}
  `;
  return rows[0] ?? null;
}

// Legt den AKTUELLEN Stand als Fassung ab — vor dem Überschreiben aufrufen.
//
// Übersprungen wird, wenn es keinen Text gibt (ein leerer Ausgangszustand ist
// nichts, was man zurückholen möchte) oder wenn der Text mit der jüngsten
// bereits gespeicherten Fassung übereinstimmt: viele Speichervorgänge ändern
// nur Stammdaten, und eine Historie aus zwanzig identischen Einträgen wäre
// wertlos.
//
// Best effort: ein Fehler hier darf das Speichern des Inhalts nicht scheitern
// lassen — die Historie ist Beiwerk, der Text der Zweck.
//
// Übersprungen wird außerdem, wenn der neue Text (nextSource) mit dem
// aktuellen übereinstimmt.
export async function recordRevision(
  contentType: RevisionContentType,
  contentId: number,
  editorId: number | null,
  // Der Text, der gleich geschrieben wird. Ist er mit dem aktuellen
  // identisch, ändert das Speichern am Text nichts (nur an Stammdaten) und
  // es entsteht keine Fassung — sonst würden ein paar folgenlose
  // Speichervorgänge die zwanzig Plätze der Historie füllen.
  nextSource?: string | null,
): Promise<void> {
  try {
    const current = await currentRow(contentType, contentId);
    if (!current?.source_md?.trim()) return;
    if (nextSource != null && nextSource === current.source_md) return;

    const [latest] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM content_revisions
      WHERE content_type = ${contentType} AND content_id = ${contentId}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `;
    if (latest && latest.source_md === current.source_md) return;

    await sql`
      INSERT INTO content_revisions (content_type, content_id, title, source_md, editor_id)
      VALUES (${contentType}, ${contentId}, ${current.title}, ${current.source_md}, ${editorId})
    `;

    // Auf die jüngsten REVISION_KEEP Fassungen eindampfen.
    await sql`
      DELETE FROM content_revisions
      WHERE content_type = ${contentType} AND content_id = ${contentId}
        AND id NOT IN (
          SELECT id FROM content_revisions
          WHERE content_type = ${contentType} AND content_id = ${contentId}
          ORDER BY created_at DESC, id DESC
          LIMIT ${REVISION_KEEP}
        )
    `;
  } catch (error) {
    console.error("recordRevision failed", contentType, contentId, error);
  }
}

// Darf dieser Betrachter die Historie eines Inhalts sehen und zurückholen?
// Dieselbe Linie wie beim Bearbeiten: der Eigentümer, sonst die
// Inhalts-Moderation. Missionen sind Domäne der Spielleitung (die
// Bearbeiten-Seite verlangt gm/admin), deshalb zählt dort zusätzlich
// gm.access.
export async function canManageRevisions(
  contentType: RevisionContentType,
  contentId: number,
  viewer: Viewer | null,
): Promise<boolean> {
  if (!viewer) return false;
  if (viewerHasPermission(viewer, "content.moderate")) return true;
  if (contentType === "mission" && viewerHasPermission(viewer, "gm.access")) {
    return true;
  }
  const current = await currentRow(contentType, contentId);
  return current != null && current.owner_id === viewer.userId;
}

interface RevisionRow {
  id: number;
  title: string | null;
  source_md: string;
  editor_name: string | null;
  created_at: string;
}

export async function listRevisions(
  contentType: RevisionContentType,
  contentId: number,
  viewer: Viewer | null,
): Promise<ContentRevision[]> {
  if (!(await canManageRevisions(contentType, contentId, viewer))) return [];
  const rows = await sql<RevisionRow[]>`
    SELECT r.id, r.title, r.source_md, u.name AS editor_name, r.created_at
    FROM content_revisions r
    LEFT JOIN users u ON u.id = r.editor_id
    WHERE r.content_type = ${contentType} AND r.content_id = ${contentId}
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ${REVISION_KEEP}
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    excerpt: revisionExcerpt(r.source_md),
    length: r.source_md.length,
    editorName: r.editor_name,
    createdAt: r.created_at,
  }));
}

// Volltext einer Fassung. Inhaltsart und -Id werden mit abgefragt, damit eine
// fremde Revisions-Id nicht den Text eines anderen Inhalts liefern kann.
export async function getRevisionSource(
  contentType: RevisionContentType,
  contentId: number,
  revisionId: number,
): Promise<string | null> {
  const rows = await sql<{ source_md: string }[]>`
    SELECT source_md FROM content_revisions
    WHERE id = ${revisionId}
      AND content_type = ${contentType}
      AND content_id = ${contentId}
  `;
  return rows[0]?.source_md ?? null;
}

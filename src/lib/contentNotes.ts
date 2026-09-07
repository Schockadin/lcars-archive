import "server-only";
import sql from "@/lib/db";
import type { Viewer } from "@/lib/visibility";
import { markdownToHtml } from "@/lib/markdown";
import {
  normalizeNoteBody,
  type ContentNote,
  type NoteContentType,
  type NoteVisibility,
} from "@/lib/contentNoteTypes";
import { viewerHasPermission } from "@/lib/visibility";

// Notizen und Kommentare an Inhalten (siehe content_notes in schema.sql).
//
// Zwei Anwendungsfälle, eine Tabelle:
//   'private' — persönliche Notiz, sieht nur der Autor
//   'group'   — Kommentar für die Runde, sehen alle eingeloggten Personen
//
// Bewusst KEIN Recht „notes.use": wer eingeloggt ist, darf Notizen schreiben.
// Das ist dieselbe Linie wie bei Lesezeichen/Abos (content_follows) — eine
// eigene Rechte-Ebene für „darf sich etwas notieren" wäre nur Verwaltung.

// Konstanten/Typen liegen in contentNoteTypes.ts (ohne "server-only"), damit
// das Client-Panel sie nutzen kann — hier nur re-exportiert, damit bestehende
// Importe aus @/lib/contentNotes unverändert funktionieren.
export {
  NOTE_CONTENT_TYPES,
  NOTE_VISIBILITIES,
  NOTE_MAX_LENGTH,
  isNoteContentType,
  isNoteVisibility,
  normalizeNoteBody,
} from "@/lib/contentNoteTypes";
export type {
  NoteContentType,
  NoteVisibility,
  ContentNote,
} from "@/lib/contentNoteTypes";

interface NoteRow {
  id: number;
  body: string;
  visibility: NoteVisibility;
  author_id: number;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

// Darf der Betrachter fremde Notizen moderieren (bearbeiten/löschen)?
// Dieselbe Linie wie bei Inhalten: content.moderate.
function canModerate(viewer: Viewer | null): boolean {
  return viewerHasPermission(viewer, "content.moderate");
}

// Alle für den Betrachter sichtbaren Notizen eines Inhalts: die eigenen
// privaten plus sämtliche Gruppen-Kommentare. Ohne Login gibt es nichts —
// Notizen sind nie öffentlich.
export async function listNotes(
  contentType: NoteContentType,
  contentSlug: string,
  viewer: Viewer | null,
): Promise<ContentNote[]> {
  if (!viewer) return [];
  const rows = await sql<NoteRow[]>`
    SELECT n.id, n.body, n.visibility, n.author_id,
           u.name AS author_name,
           n.created_at, n.updated_at
    FROM content_notes n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.content_type = ${contentType}
      AND n.content_slug = ${contentSlug}
      AND (n.visibility = 'group' OR n.author_id = ${viewer.userId})
    ORDER BY n.created_at ASC
  `;
  const moderator = canModerate(viewer);
  // Markdown je Notiz rendern. Bewusst hier und nicht beim Speichern: der
  // Rohtext bleibt die Quelle (er wird beim Bearbeiten wieder gebraucht), und
  // eine Notizliste ist kurz — an einem Inhalt stehen ein paar Einträge, nicht
  // hunderte.
  const html = await Promise.all(rows.map((r) => markdownToHtml(r.body)));

  return rows.map((r, index) => ({
    id: r.id,
    body: r.body,
    bodyHtml: html[index],
    visibility: r.visibility,
    authorId: r.author_id,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    // Private Notizen gehören ausschließlich ihrem Autor — auch die
    // Moderation fasst sie nicht an (sie sieht sie ohnehin nicht).
    canEdit: r.author_id === viewer.userId || (r.visibility === "group" && moderator),
  }));
}

export async function addNote(
  contentType: NoteContentType,
  contentSlug: string,
  viewer: Viewer,
  body: string,
  visibility: NoteVisibility,
): Promise<void> {
  const clean = normalizeNoteBody(body);
  if (!clean) return;
  await sql`
    INSERT INTO content_notes (content_type, content_slug, author_id, body, visibility)
    VALUES (${contentType}, ${contentSlug}, ${viewer.userId}, ${clean}, ${visibility})
  `;
}

// Löschen: eigene Notiz immer, fremde nur als Moderation und nur, wenn sie
// eine Gruppen-Notiz ist. Die WHERE-Klausel setzt das mit durch, damit die
// Regel nicht allein an der UI hängt.
export async function deleteNote(id: number, viewer: Viewer): Promise<void> {
  if (canModerate(viewer)) {
    await sql`
      DELETE FROM content_notes
      WHERE id = ${id} AND (author_id = ${viewer.userId} OR visibility = 'group')
    `;
    return;
  }
  await sql`
    DELETE FROM content_notes WHERE id = ${id} AND author_id = ${viewer.userId}
  `;
}

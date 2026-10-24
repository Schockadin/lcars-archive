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
import { canView, canViewMissionDraft } from "@/lib/visibility";
import {
  archiveHref,
  characterHref,
  missionHref,
  missionLogHref,
} from "@/lib/contentRoutes";

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

export interface UserNote extends ContentNote {
  targetLabel: string;
  targetHref: string | null;
}

export interface NoteTarget {
  type: Exclude<NoteContentType, "standalone">;
  slug: string;
  label: string;
}

interface UserNoteRow extends NoteRow {
  content_type: NoteContentType;
  target_label: string;
  target_slug: string;
  parent_slug: string | null;
  target_owner_id: number | null;
  target_is_draft: boolean;
  parent_owner_id: number | null;
  parent_is_draft: boolean;
}

export async function listNotesForUser(viewer: Viewer): Promise<UserNote[]> {
  const rows = await sql<UserNoteRow[]>`
    SELECT n.id, n.content_type, n.content_slug, n.author_id, n.body,
           n.visibility, n.created_at::text AS created_at,
           n.updated_at::text AS updated_at, u.name AS author_name,
           c.name AS target_label,
           c.slug AS target_slug, NULL::text AS parent_slug,
           c.player_id AS target_owner_id, c.is_draft AS target_is_draft,
           NULL::int AS parent_owner_id, false AS parent_is_draft
    FROM content_notes n
    JOIN characters c ON n.content_type = 'character' AND c.slug = n.content_slug
    LEFT JOIN users u ON u.id = n.author_id
    WHERE c.deleted_at IS NULL AND (n.author_id = ${viewer.userId} OR n.visibility = 'group')
    UNION ALL
    SELECT n.id, n.content_type, n.content_slug, n.author_id, n.body,
           n.visibility, n.created_at::text, n.updated_at::text,
           u.name, m.title, m.slug, NULL::text,
           m.owner_user_id, m.is_draft, NULL::int, false
    FROM content_notes n
    JOIN missions m ON n.content_type = 'mission' AND m.slug = n.content_slug
    LEFT JOIN users u ON u.id = n.author_id
    WHERE m.deleted_at IS NULL AND (n.author_id = ${viewer.userId} OR n.visibility = 'group')
    UNION ALL
    SELECT n.id, n.content_type, n.content_slug, n.author_id, n.body,
           n.visibility, n.created_at::text, n.updated_at::text,
           u.name, ml.title, ml.slug, m.slug,
           ml.owner_user_id, ml.is_draft, m.owner_user_id, m.is_draft
    FROM content_notes n
    JOIN mission_logs ml ON n.content_type = 'mission_log' AND ml.slug = n.content_slug
    JOIN missions m ON m.id = ml.mission_id
    LEFT JOIN users u ON u.id = n.author_id
    WHERE ml.deleted_at IS NULL AND m.deleted_at IS NULL
      AND (n.author_id = ${viewer.userId} OR n.visibility = 'group')
    UNION ALL
    SELECT n.id, n.content_type, n.content_slug, n.author_id, n.body,
           n.visibility, n.created_at::text, n.updated_at::text,
           u.name, a.title, a.slug, NULL::text,
           a.owner_user_id, a.is_draft, NULL::int, false
    FROM content_notes n
    JOIN archive_entries a ON n.content_type = 'archive' AND a.slug = n.content_slug
    LEFT JOIN users u ON u.id = n.author_id
    WHERE a.deleted_at IS NULL AND (n.author_id = ${viewer.userId} OR n.visibility = 'group')
    UNION ALL
    SELECT n.id, n.content_type, n.content_slug, n.author_id, n.body,
           n.visibility, n.created_at::text, n.updated_at::text,
           u.name, 'Ohne Eintrag', ''::text, NULL::text,
           n.author_id, false, NULL::int, false
    FROM content_notes n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.content_type = 'standalone'
      AND (n.author_id = ${viewer.userId} OR n.visibility = 'group')
    ORDER BY updated_at DESC, id DESC
  `;
  const visible = rows.filter((row) => {
    const targetVisible =
      row.content_type === "mission"
        ? canViewMissionDraft(row.target_is_draft, viewer)
        : canView(row.target_is_draft, row.target_owner_id, viewer);
    return (
      targetVisible &&
      (!row.parent_is_draft || canViewMissionDraft(true, viewer))
    );
  });
  const html = await Promise.all(
    visible.map((row) => markdownToHtml(row.body)),
  );
  return visible.map((row, index) => ({
    id: row.id,
    body: row.body,
    bodyHtml: html[index],
    visibility: row.visibility,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canEdit:
      row.author_id === viewer.userId ||
      (row.visibility === "group" && canModerate(viewer)),
    targetLabel: row.target_label,
    targetHref:
      row.content_type === "character"
        ? characterHref(row.target_slug)
        : row.content_type === "mission"
          ? missionHref(row.target_slug)
          : row.content_type === "mission_log"
            ? missionLogHref(row.parent_slug ?? "", row.target_slug)
            : row.content_type === "archive"
              ? archiveHref(row.target_slug)
              : null,
  }));
}

// Auswahl im Anlege-Dialog: nur Ziele, die der Betrachter selbst öffnen darf.
export async function listNoteTargetsForUser(
  viewer: Viewer,
): Promise<NoteTarget[]> {
  const rows = await sql<
    {
      type: NoteTarget["type"];
      slug: string;
      label: string;
      owner_id: number | null;
      is_draft: boolean;
      parent_is_draft: boolean;
    }[]
  >`
    SELECT 'character' AS type, slug, name AS label, player_id AS owner_id,
           is_draft, false AS parent_is_draft
    FROM characters WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'mission', slug, title, owner_user_id, is_draft, false
    FROM missions WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'mission_log', ml.slug, ml.title, ml.owner_user_id,
           ml.is_draft, m.is_draft
    FROM mission_logs ml JOIN missions m ON m.id = ml.mission_id
    WHERE ml.deleted_at IS NULL AND m.deleted_at IS NULL
    UNION ALL
    SELECT 'archive', slug, title, owner_user_id, is_draft, false
    FROM archive_entries WHERE deleted_at IS NULL
  `;
  return rows
    .filter(
      (row) =>
        (row.type === "mission"
          ? canViewMissionDraft(row.is_draft, viewer)
          : canView(row.is_draft, row.owner_id, viewer)) &&
        (!row.parent_is_draft || canViewMissionDraft(true, viewer)),
    )
    .map(({ type, slug, label }) => ({ type, slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}

export async function addUserNote(
  viewer: Viewer,
  body: string,
  visibility: NoteVisibility,
  target: Pick<NoteTarget, "type" | "slug"> | null,
): Promise<void> {
  const clean = normalizeNoteBody(body);
  if (!clean) throw new Error("Die Notiz ist leer.");
  if (
    target &&
    !(await listNoteTargetsForUser(viewer)).some(
      (item) => item.type === target.type && item.slug === target.slug,
    )
  )
    throw new Error("Der Eintrag ist nicht verfügbar.");
  await sql`
    INSERT INTO content_notes (content_type, content_slug, author_id, body, visibility)
    VALUES (${target?.type ?? "standalone"}, ${target?.slug ?? ""}, ${viewer.userId}, ${clean}, ${visibility})
  `;
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
    canEdit:
      r.author_id === viewer.userId || (r.visibility === "group" && moderator),
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
export async function updateNote(
  id: number,
  viewer: Viewer,
  body: string,
): Promise<boolean> {
  const clean = normalizeNoteBody(body);
  if (!clean) return false;
  const rows = await sql<{ id: number }[]>`
    UPDATE content_notes SET body = ${clean}, updated_at = NOW()
    WHERE id = ${id}
      AND (author_id = ${viewer.userId}
        OR (visibility = 'group' AND ${canModerate(viewer)}))
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteNote(id: number, viewer: Viewer): Promise<boolean> {
  if (canModerate(viewer)) {
    const rows = await sql<{ id: number }[]>`
      DELETE FROM content_notes
      WHERE id = ${id} AND (author_id = ${viewer.userId} OR visibility = 'group')
      RETURNING id
    `;
    return rows.length > 0;
  }
  const rows = await sql<{ id: number }[]>`
    DELETE FROM content_notes WHERE id = ${id} AND author_id = ${viewer.userId}
    RETURNING id
  `;
  return rows.length > 0;
}

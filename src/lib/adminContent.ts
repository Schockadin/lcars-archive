import "server-only";
import sql from "@/lib/db";
import type { OwnerContentType } from "@/app/actions/owner";

export type TrashContentType = OwnerContentType | "dialogue";

export interface AdminContentItem {
  contentType: OwnerContentType;
  id: number;
  slug: string;
  title: string;
  href: string;
  ownerId: number | null;
  ownerName: string | null;
  updatedAt: string;
}

// Alle Inhalte über die vier Typen hinweg, für die Admin-Inhaltsübersicht
// (/admin/content, AdminContentBrowser.tsx) — owner_user_id (bzw. player_id
// bei Charakteren) UND Owner-Name in einer Query, damit die Browser-UI ohne
// weiteren Join filtern/gruppieren kann. Dialoge (archive_entries mit
// category='dialogue') bleiben ausgeschlossen: die haben ihr eigenes
// Owner-/Teilnehmer-Modell, siehe setArchiveEntryOwner in lib/archive.ts,
// das aus demselben Grund category != 'dialogue' filtert.
export async function getAllContentForAdmin(): Promise<AdminContentItem[]> {
  const rows = await sql<
    {
      content_type: OwnerContentType;
      id: number;
      slug: string;
      title: string;
      href: string;
      owner_id: number | null;
      owner_name: string | null;
      updated_at: string;
    }[]
  >`
    SELECT 'character'::text AS content_type, c.id, c.slug, c.name AS title,
           ('/characters/' || c.slug) AS href,
           c.player_id AS owner_id, ou.name AS owner_name,
           c.updated_at::text AS updated_at
    FROM characters c
    LEFT JOIN users ou ON ou.id = c.player_id
    WHERE c.deleted_at IS NULL

    UNION ALL

    SELECT 'mission'::text, m.id, m.slug, m.title,
           ('/missions/' || m.slug),
           m.owner_user_id, ou.name,
           m.updated_at::text
    FROM missions m
    LEFT JOIN users ou ON ou.id = m.owner_user_id
    WHERE m.deleted_at IS NULL

    UNION ALL

    SELECT 'mission_log'::text, ml.id, ml.slug, ml.title,
           ('/missions/' || m.slug || '/' || ml.slug),
           ml.owner_user_id, ou.name,
           ml.updated_at::text
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    LEFT JOIN users ou ON ou.id = ml.owner_user_id
    WHERE ml.deleted_at IS NULL

    UNION ALL

    SELECT 'archive_entry'::text, a.id, a.slug, a.title,
           ('/archive/' || a.slug),
           a.owner_user_id, ou.name,
           a.updated_at::text
    FROM archive_entries a
    LEFT JOIN users ou ON ou.id = a.owner_user_id
    WHERE a.category != 'dialogue' AND a.deleted_at IS NULL

    ORDER BY title ASC
  `;

  return rows.map((row) => ({
    contentType: row.content_type,
    id: row.id,
    slug: row.slug,
    title: row.title,
    href: row.href,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    updatedAt: row.updated_at,
  }));
}

export interface TrashItem {
  contentType: TrashContentType;
  id: number;
  slug: string;
  title: string;
  ownerId: number | null;
  ownerName: string | null;
  deletedAt: string;
}

// Weich gelöschte Inhalte über alle fünf Typen hinweg (inkl. Dialoge, anders
// als getAllContentForAdmin oben) — für die Admin-Trash-Ansicht
// (/admin/content/trash). Kein href: gelöschte Inhalte sind über ihre
// normale Detailseite nicht mehr erreichbar (alle *BySlug-Funktionen
// filtern deleted_at), die Trash-Ansicht bietet stattdessen nur
// Wiederherstellen/Endgültig löschen an.
export async function getDeletedContentForAdmin(): Promise<TrashItem[]> {
  const rows = await sql<
    {
      content_type: TrashContentType;
      id: number;
      slug: string;
      title: string;
      owner_id: number | null;
      owner_name: string | null;
      deleted_at: string;
    }[]
  >`
    SELECT 'character'::text AS content_type, c.id, c.slug, c.name AS title,
           c.player_id AS owner_id, ou.name AS owner_name,
           c.deleted_at::text AS deleted_at
    FROM characters c
    LEFT JOIN users ou ON ou.id = c.player_id
    WHERE c.deleted_at IS NOT NULL

    UNION ALL

    SELECT 'mission'::text, m.id, m.slug, m.title,
           m.owner_user_id, ou.name,
           m.deleted_at::text
    FROM missions m
    LEFT JOIN users ou ON ou.id = m.owner_user_id
    WHERE m.deleted_at IS NOT NULL

    UNION ALL

    SELECT 'mission_log'::text, ml.id, ml.slug, ml.title,
           ml.owner_user_id, ou.name,
           ml.deleted_at::text
    FROM mission_logs ml
    LEFT JOIN users ou ON ou.id = ml.owner_user_id
    WHERE ml.deleted_at IS NOT NULL

    UNION ALL

    SELECT 'archive_entry'::text, a.id, a.slug, a.title,
           a.owner_user_id, ou.name,
           a.deleted_at::text
    FROM archive_entries a
    LEFT JOIN users ou ON ou.id = a.owner_user_id
    WHERE a.category != 'dialogue' AND a.deleted_at IS NOT NULL

    UNION ALL

    SELECT 'dialogue'::text, a.id, a.slug, a.title,
           a.owner_user_id, ou.name,
           a.deleted_at::text
    FROM archive_entries a
    LEFT JOIN users ou ON ou.id = a.owner_user_id
    WHERE a.category = 'dialogue' AND a.deleted_at IS NOT NULL

    ORDER BY deleted_at DESC
  `;

  return rows.map((row) => ({
    contentType: row.content_type,
    id: row.id,
    slug: row.slug,
    title: row.title,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    deletedAt: row.deleted_at,
  }));
}

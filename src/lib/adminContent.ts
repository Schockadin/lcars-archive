import "server-only";
import sql from "@/lib/db";
import type { OwnerContentType } from "@/app/actions/owner";

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

    UNION ALL

    SELECT 'mission'::text, m.id, m.slug, m.title,
           ('/missions/' || m.slug),
           m.owner_user_id, ou.name,
           m.updated_at::text
    FROM missions m
    LEFT JOIN users ou ON ou.id = m.owner_user_id

    UNION ALL

    SELECT 'mission_log'::text, ml.id, ml.slug, ml.title,
           ('/missions/' || m.slug || '/' || ml.slug),
           ml.owner_user_id, ou.name,
           ml.updated_at::text
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    LEFT JOIN users ou ON ou.id = ml.owner_user_id

    UNION ALL

    SELECT 'archive_entry'::text, a.id, a.slug, a.title,
           ('/archive/' || a.slug),
           a.owner_user_id, ou.name,
           a.updated_at::text
    FROM archive_entries a
    LEFT JOIN users ou ON ou.id = a.owner_user_id
    WHERE a.category != 'dialogue'

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

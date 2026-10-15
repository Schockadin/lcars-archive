import "server-only";
import sql from "@/lib/db";
import { canView, canViewMissionDraft, type Viewer } from "@/lib/visibility";
import {
  archiveHref,
  characterHref,
  dialogueContentHref,
  missionHref,
  missionLogHref,
} from "@/lib/contentRoutes";

export interface ImageReference {
  label: string;
  href: string;
}

interface ReferenceRow {
  kind:
    | "character"
    | "mission"
    | "mission_log"
    | "archive"
    | "dialogue"
    | "timeline_event";
  id: number;
  label: string;
  slug: string;
  parent_slug: string | null;
  open: boolean | null;
  owner_id: number | null;
  is_draft: boolean;
  body: string;
}

function referenceHref(row: ReferenceRow): string {
  switch (row.kind) {
    case "character":
      return characterHref(row.slug);
    case "mission":
      return missionHref(row.slug);
    case "mission_log":
      return missionLogHref(row.parent_slug ?? "", row.slug);
    case "archive":
      return archiveHref(row.slug);
    case "dialogue":
      return dialogueContentHref(row.slug, row.open ?? false);
    case "timeline_event":
      return row.slug.startsWith("/") ? row.slug : "/chronologie";
  }
}

// Die Bildbibliothek speichert öffentliche Asset-URLs in den aktuellen
// Inhaltsfeldern. Der eindeutige R2-Key darin verbindet ein Bild mit allen
// Einträgen, in denen es tatsächlich vorkommt. Entwürfe anderer Personen
// werden vor der Rückgabe nach denselben Leserechten wie die Inhaltsseiten
// ausgefiltert.
export async function listUserImageReferences(
  ownerId: number,
  viewer: Viewer,
): Promise<Record<number, ImageReference[]>> {
  const keys = await sql<
    { id: number; r2_key: string; source_image_key: string | null }[]
  >`
    SELECT id, r2_key, source_image_key FROM user_images WHERE owner_id = ${ownerId}
  `;
  if (keys.length === 0) return {};
  const sourceKeys = keys.flatMap((image) =>
    image.source_image_key ? [image.source_image_key] : [],
  );
  const sourceImages =
    sourceKeys.length > 0
      ? await sql<{ id: number; r2_key: string }[]>`
        SELECT id, r2_key FROM content_images
        WHERE r2_key = ANY(${sourceKeys}::text[])
      `
      : [];
  const sourceIds = new Map(
    sourceImages.map((image) => [image.r2_key, image.id]),
  );
  const needles = new Map(
    keys.map((image) => [
      image.id,
      [
        image.r2_key,
        image.source_image_key,
        image.source_image_key
          ? `/api/content-images/${sourceIds.get(image.source_image_key)}`
          : null,
      ].filter(
        (value): value is string => !!value && !value.endsWith("/undefined"),
      ),
    ]),
  );
  const patterns = [...new Set([...needles.values()].flat())].map(
    (key) => `%${key}%`,
  );
  const rows = await sql<ReferenceRow[]>`
    SELECT 'character' AS kind, id, name AS label, slug,
           NULL::text AS parent_slug, NULL::boolean AS open,
           player_id AS owner_id, is_draft,
           concat_ws(' ', portrait, bio, source_md) AS body
    FROM characters
    WHERE deleted_at IS NULL
      AND concat_ws(' ', portrait, bio, source_md) LIKE ANY(${patterns}::text[])
    UNION ALL
    SELECT 'mission', id, title, slug, NULL::text, NULL::boolean,
           owner_user_id, is_draft, concat_ws(' ', source_md, metadata::text)
    FROM missions
    WHERE deleted_at IS NULL
      AND concat_ws(' ', source_md, metadata::text) LIKE ANY(${patterns}::text[])
    UNION ALL
    SELECT 'mission_log', ml.id, ml.title, ml.slug, m.slug,
           NULL::boolean, ml.owner_user_id, ml.is_draft,
           concat_ws(' ', ml.content, ml.source_md, ml.metadata::text)
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    WHERE ml.deleted_at IS NULL AND m.deleted_at IS NULL
      AND (NOT m.is_draft OR m.owner_user_id = ${viewer.userId}
           OR ${viewer.permissions.includes("missions.manage") || viewer.permissions.includes("content.view_all")})
      AND concat_ws(' ', ml.content, ml.source_md, ml.metadata::text) LIKE ANY(${patterns}::text[])
    UNION ALL
    SELECT CASE WHEN category = 'dialogue' THEN 'dialogue' ELSE 'archive' END,
           id, title, slug, NULL::text, dialogue_open,
           owner_user_id, is_draft,
           concat_ws(' ', content, source_md, metadata::text)
    FROM archive_entries
    WHERE deleted_at IS NULL
      AND concat_ws(' ', content, source_md, metadata::text) LIKE ANY(${patterns}::text[])
    UNION ALL
    SELECT 'dialogue', a.id, a.title, a.slug, NULL::text,
           a.dialogue_open, a.owner_user_id, a.is_draft,
           concat_ws(' ', message.content, message.source_md)
    FROM dialogue_messages message
    JOIN archive_entries a ON a.id = message.archive_entry_id
    WHERE a.deleted_at IS NULL AND message.deleted_at IS NULL
      AND concat_ws(' ', message.content, message.source_md) LIKE ANY(${patterns}::text[])
    UNION ALL
    SELECT 'timeline_event', id, title, href, NULL::text,
           NULL::boolean, created_by, false,
           concat_ws(' ', detail, teaser)
    FROM timeline_events
    WHERE origin = 'manual'
      AND concat_ws(' ', detail, teaser) LIKE ANY(${patterns}::text[])
  `;
  const visible = rows.filter((row) =>
    row.kind === "mission"
      ? canViewMissionDraft(row.is_draft, viewer)
      : canView(row.is_draft, row.owner_id, viewer),
  );
  return Object.fromEntries(
    keys.map((image) => {
      const seen = new Set<string>();
      const references = visible.flatMap((row) => {
        if (
          !(needles.get(image.id) ?? []).some((needle) =>
            row.body.includes(needle),
          )
        )
          return [];
        const href = referenceHref(row);
        if (seen.has(href)) return [];
        seen.add(href);
        return [{ label: row.label, href }];
      });
      return [image.id, references];
    }),
  );
}

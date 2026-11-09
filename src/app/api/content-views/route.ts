import { NextRequest, NextResponse } from "next/server";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { getCharacterBySlug } from "@/lib/characters";
import {
  archiveHref,
  characterHref,
  missionHref,
  missionLogHref,
} from "@/lib/contentRoutes";
import { getLogBySlug, getMissionBySlug } from "@/lib/missions";
import {
  recordContentView,
} from "@/lib/contentViews";
import { CONTENT_VIEW_TYPES, type ContentViewType } from "@/lib/contentViewTypes";
import { getViewer, canView, canViewMissionDraft } from "@/lib/visibility";

const NO_STORE = { "Cache-Control": "private, no-store, no-cache, must-revalidate" };

function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 200 &&
    !/[\\/\u0000-\u001f]/.test(value)
  );
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415, headers: NO_STORE });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1_024) {
      return NextResponse.json(
        { error: "Request too large" },
        { status: 413, headers: NO_STORE },
      );
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400, headers: NO_STORE });
  }
  const { contentType, slug } = body as {
    contentType?: unknown;
    slug?: unknown;
  };
  if (
    typeof contentType !== "string" ||
    !CONTENT_VIEW_TYPES.includes(contentType as ContentViewType) ||
    !isValidSlug(slug)
  ) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400, headers: NO_STORE });
  }

  const viewer = await getViewer();
  // Anonyme und abgelaufene/deaktivierte Sessions erzeugen keine Einträge.
  if (!viewer) return new NextResponse(null, { status: 204, headers: NO_STORE });

  let event:
    | {
        contentType: ContentViewType;
        contentSlug: string;
        contentTitle: string;
        routePath: string;
      }
    | null = null;

  switch (contentType as ContentViewType) {
    case "character": {
      const character = await getCharacterBySlug(slug);
      if (
        character &&
        canView(character.is_draft, character.player_id, viewer)
      ) {
        event = {
          contentType: "character",
          contentSlug: character.slug,
          contentTitle: character.name,
          routePath: characterHref(character.slug),
        };
      }
      break;
    }
    case "mission": {
      const mission = await getMissionBySlug(slug);
      if (mission && canViewMissionDraft(mission.isDraft, viewer)) {
        event = {
          contentType: "mission",
          contentSlug: mission.slug,
          contentTitle: mission.title,
          routePath: missionHref(mission.slug),
        };
      }
      break;
    }
    case "mission_log": {
      const log = await getLogBySlug(slug);
      if (log && canView(log.isDraft, log.ownerUserId, viewer)) {
        event = {
          contentType: "mission_log",
          contentSlug: log.slug,
          contentTitle: log.title,
          routePath: missionLogHref(log.mission_slug, log.slug),
        };
      }
      break;
    }
    case "archive_entry": {
      const entry = await getArchiveEntryBySlug(slug);
      // Gesprächsinhalte können private Nachrichten enthalten und werden
      // deshalb unabhängig vom Status nicht in diesem Leseprotokoll erfasst.
      if (
        entry &&
        entry.category !== "dialogue" &&
        canView(entry.isDraft, entry.ownerUserId, viewer)
      ) {
        event = {
          contentType: "archive_entry",
          contentSlug: entry.slug,
          contentTitle: entry.title,
          routePath: archiveHref(entry.slug),
        };
      }
      break;
    }
  }

  // Unbekannte, gelöschte oder nicht sichtbare Inhalte werden einheitlich
  // ignoriert. Der Endpunkt bestätigt damit keine privaten Slugs.
  if (!event) return new NextResponse(null, { status: 204, headers: NO_STORE });

  await recordContentView({ userId: viewer.userId, ...event });
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

"use server";
import { verifySession } from "@/lib/dal";
import { markNewsSeen, type NewsSeenTargetType } from "@/lib/newsSeen";

const VALID_TARGET_TYPES: NewsSeenTargetType[] = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
  "deletion",
];

// Blendet eine einzelne News auf dem Dashboard aus (X-Button in
// NewsSection.tsx). Setzt die „gesehen bis"-Grenze des Ziels auf den
// Zeitstempel genau dieser News (nicht now()), damit eine spätere Bearbeitung
// desselben Inhalts wieder als neue News auftaucht (siehe markNewsSeen).
export async function dismissNewsAction(
  targetType: string,
  targetKey: string,
  timestamp: string,
): Promise<{ ok: boolean }> {
  const session = await verifySession();

  if (!VALID_TARGET_TYPES.includes(targetType as NewsSeenTargetType)) {
    return { ok: false };
  }
  const seenAt = new Date(timestamp);
  if (Number.isNaN(seenAt.getTime())) return { ok: false };

  await markNewsSeen(
    session.userId,
    targetType as NewsSeenTargetType,
    targetKey,
    seenAt,
  );
  return { ok: true };
}

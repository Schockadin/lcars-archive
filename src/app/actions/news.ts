"use server";
import { verifySession } from "@/lib/dal";
import {
  markNewsSeen,
  markManyNewsSeen,
  type NewsSeenTargetType,
  type MarkSeenInput,
} from "@/lib/newsSeen";

const VALID_TARGET_TYPES: NewsSeenTargetType[] = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
  "deletion",
];

// Blendet eine einzelne News auf dem Dashboard aus (X-Button in
// NewsSection.tsx) — und markiert sie damit dauerhaft als gelesen (Eintrag in
// news_seen). Setzt die „gesehen bis"-Grenze des Ziels auf den Zeitstempel
// genau dieser News (nicht now()), damit eine spätere Bearbeitung desselben
// Inhalts wieder als neue News auftaucht (siehe markNewsSeen).
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

// „Alles als gelesen markieren" — markiert alle übergebenen News auf einmal
// als gelesen (news_seen). Der Client übergibt die aktuell angezeigten News;
// ungültige Einträge werden defensiv verworfen.
export async function markAllNewsSeenAction(
  items: { targetType: string; targetKey: string; timestamp: string }[],
): Promise<{ ok: boolean }> {
  const session = await verifySession();

  const entries: MarkSeenInput[] = [];
  for (const item of items) {
    if (!VALID_TARGET_TYPES.includes(item.targetType as NewsSeenTargetType)) {
      continue;
    }
    const seenAt = new Date(item.timestamp);
    if (Number.isNaN(seenAt.getTime())) continue;
    entries.push({
      targetType: item.targetType as NewsSeenTargetType,
      targetKey: item.targetKey,
      seenAt,
    });
  }

  await markManyNewsSeen(session.userId, entries);
  return { ok: true };
}

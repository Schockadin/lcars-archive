import "server-only";
import sql from "@/lib/db";
import type { TimelineSourceType } from "@/types/timeline";

// Persistente News-Anzeige (siehe scripts/schema.sql, Tabelle news_seen und
// NewsSection.tsx): eine News bleibt sichtbar, bis der User sie per X
// ausblendet ODER den zugehörigen Inhalt aufruft. seen_at ist die Grenze pro
// Ziel — eine News gilt als erledigt, wenn ihr Zeitstempel <= seen_at ist.

// target_type in news_seen: die vier Inhaltstypen (created/updated) plus
// 'deletion' (target_key = content_deletions.id als Text).
export type NewsSeenTargetType = TimelineSourceType | "deletion";

// Setzt/aktualisiert die "gesehen bis"-Grenze für ein Ziel. seenAt = now()
// beim Aufruf des Inhalts, bzw. der Zeitstempel der News beim gezielten
// Ausblenden per X. GREATEST verhindert, dass ein späteres X mit älterem
// Zeitstempel eine bereits weiter fortgeschrittene Grenze zurücksetzt.
export async function markNewsSeen(
  userId: number,
  targetType: NewsSeenTargetType,
  targetKey: string,
  seenAt?: Date,
): Promise<void> {
  const ts = seenAt ?? new Date();
  await sql`
    INSERT INTO news_seen (user_id, target_type, target_key, seen_at)
    VALUES (${userId}, ${targetType}, ${targetKey}, ${ts})
    ON CONFLICT (user_id, target_type, target_key)
    DO UPDATE SET seen_at = GREATEST(news_seen.seen_at, EXCLUDED.seen_at)
  `;
}

export interface MarkSeenInput {
  targetType: NewsSeenTargetType;
  targetKey: string;
  seenAt: Date;
}

// Mehrere "gesehen"-Grenzen auf einmal setzen — für "Alles als gelesen
// markieren" (NewsSection.tsx). Bewusst ein einfacher Loop über exakt dasselbe
// Einzel-Upsert wie markNewsSeen (das nachweislich zuverlässig persistiert),
// statt eines Bulk-Inserts: frühere Bulk-Varianten (sql(rows, …) bzw. unnest())
// haben in Kombination mit ON CONFLICT nicht zuverlässig geschrieben. Die
// News-Anzahl ist durch das Zeitfenster begrenzt, der Loop ist also
// unproblematisch.
export async function markManyNewsSeen(
  userId: number,
  entries: MarkSeenInput[],
): Promise<void> {
  for (const entry of entries) {
    await markNewsSeen(userId, entry.targetType, entry.targetKey, entry.seenAt);
  }
}

export interface NewsSeenEntry {
  targetType: string;
  targetKey: string;
  seenAt: string;
}

// Alle "gesehen"-Grenzen eines Users — die Dashboard-News-Abfrage filtert
// damit in JS (statt pro News-Kandidat einzeln zu joinen).
export async function getNewsSeenForUser(
  userId: number,
): Promise<NewsSeenEntry[]> {
  const rows = await sql<
    { target_type: string; target_key: string; seen_at: string }[]
  >`
    SELECT target_type, target_key, seen_at::text AS seen_at
    FROM news_seen
    WHERE user_id = ${userId}
  `;
  return rows.map((r) => ({
    targetType: r.target_type,
    targetKey: r.target_key,
    seenAt: r.seen_at,
  }));
}

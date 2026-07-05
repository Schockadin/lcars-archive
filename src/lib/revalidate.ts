import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cacheTags";

// Gemeinsame Invalidierungs-Oberfläche für alle Mutationsquellen.
//
// Heute genutzt von der Revalidate-Route (Ingest, Schritt 3); vorgesehen für
// den künftigen User-Bereich (Schritt 4), dessen Server Actions nach einem
// DB-Write dieselben Helfer aufrufen — gleiche Tags aus cacheTags.ts, keine
// zusätzliche Infrastruktur.
//
// Next 16: revalidateTag erwartet ein zweites Argument. Für extern ausgelöste
// Invalidierung (Ingest/Webhook) ist { expire: 0 } die empfohlene Form —
// sofortige Expiration, damit der nächste Request frische Daten erhält.
const IMMEDIATE = { expire: 0 } as const;

function revalidate(tags: string[]): string[] {
  for (const tag of tags) {
    revalidateTag(tag, IMMEDIATE);
  }
  return tags;
}

// Grobkörnig: alle inhaltlichen Sammel-Tags. Für den Ingest, der potenziell
// jeden Inhalt ändert, und als sicherer Default.
export function revalidateAllContent(): string[] {
  return revalidate([
    cacheTags.characters,
    cacheTags.missions,
    cacheTags.missionLogs,
    cacheTags.archive,
    cacheTags.timeline,
    cacheTags.stats,
  ]);
}

// Feinkörnige Helfer für den künftigen User-Bereich: eine Server Action ruft
// nach dem gezielten Write nur den passenden Helfer auf, statt alles zu
// invalidieren. (Noch nicht verdrahtet — Vorbereitung gemäß Schritt 4.)
export function revalidateMission(slug: string): string[] {
  return revalidate([
    cacheTags.missions,
    cacheTags.mission(slug),
    cacheTags.missionLogs,
    cacheTags.stats,
  ]);
}

export function revalidateCharacter(slug: string): string[] {
  return revalidate([
    cacheTags.characters,
    cacheTags.character(slug),
    cacheTags.stats,
  ]);
}

export function revalidateLog(missionId: number, logSlug: string): string[] {
  return revalidate([
    cacheTags.missionLogs,
    cacheTags.missionLogsOf(missionId),
    cacheTags.log(logSlug),
    cacheTags.stats,
  ]);
}

export function revalidateArchiveEntry(slug: string): string[] {
  return revalidate([
    cacheTags.archive,
    cacheTags.archiveEntry(slug),
    cacheTags.stats,
  ]);
}

// Für die Admin-Action "Timeline (re-)generieren" (siehe regenerateTimeline
// in src/lib/timeline.ts) — dort werden alle timeline_events komplett neu
// aufgebaut, betrifft also nur den timeline-Tag selbst.
export function revalidateTimeline(): string[] {
  return revalidate([cacheTags.timeline]);
}

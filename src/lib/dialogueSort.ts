// Reine, DB-/React-freie Sortier-Helfer für die Dialog-Listen (Dashboard,
// GM-Übersicht) — ausgelagert aus dialoguesCore.ts, damit sie ohne die dortige
// DB-/Markdown-Importkette unit-testbar sind (gleiches Muster wie
// dialogueLock.ts). Die SQL-basierten Listen (z.B. getAllOpenDialoguesForGM)
// sortieren äquivalent direkt in der Query
// (ORDER BY metadata->>'logDate' DESC NULLS LAST).

// Ingame-Datum eines Gesprächs aus metadata.logDate (ISO YYYY-MM-DD). null,
// wenn nicht gesetzt oder leer. metadata kann als JSON-String (Alt-Pfade) oder
// bereits geparstes Objekt (postgres jsonb) vorliegen.
export function parseDialogueLogDate(metadata: unknown): string | null {
  let parsed: { logDate?: unknown } | null;
  if (typeof metadata === "string") {
    try {
      parsed = JSON.parse(metadata) as { logDate?: unknown } | null;
    } catch {
      return null;
    }
  } else {
    parsed = metadata as { logDate?: unknown } | null;
  }
  const value = parsed?.logDate;
  return typeof value === "string" && value.trim() ? value : null;
}

// Vergleichsfunktion: nach logDate ABSTEIGEND (neueste zuerst), Gespräche ohne
// logDate ans Ende; bei gleichem/fehlendem Datum jüngere Aktivität (updatedAt)
// zuerst. ISO-Datums-Strings vergleichen lexikografisch = chronologisch.
export function byDialogueLogDateDesc(
  a: { logDate: string | null; updatedAt: string },
  b: { logDate: string | null; updatedAt: string },
): number {
  if (a.logDate !== b.logDate) {
    if (a.logDate === null) return 1;
    if (b.logDate === null) return -1;
    return a.logDate < b.logDate ? 1 : -1;
  }
  return b.updatedAt.localeCompare(a.updatedAt);
}

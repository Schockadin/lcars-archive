// Zentrale Quelle aller Cache-Tag-Namen.
//
// Lese-Pfad (unstable_cache in src/lib/*.ts) und Invalidierungs-Pfad
// (revalidateTag beim Ingest in Schritt 3 bzw. künftige User-Writes) müssen
// exakt dieselben Tags verwenden — deshalb hier zentral definiert.
//
// Konvention:
//   - Sammel-Tags (z.B. "missions") invalidieren alle Einträge eines Typs.
//   - Einzel-Tags (z.B. "mission:erster-kontakt") invalidieren gezielt einen.
export const cacheTags = {
  characters: "characters",
  character: (slug: string) => `character:${slug}`,

  missions: "missions",
  mission: (slug: string) => `mission:${slug}`,

  missionLogs: "mission-logs",
  missionLogsOf: (missionId: number) => `mission-logs:${missionId}`,
  log: (slug: string) => `log:${slug}`,

  archive: "archive",
  archiveEntry: (slug: string) => `archive:${slug}`,

  stats: "stats",
} as const;

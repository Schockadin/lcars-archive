// Die Adressen der Inhaltsseiten an EINER Stelle.
//
// Anlass war der Umzug der Missionsseiten: sie lagen unter /missions/[slug],
// während die Übersicht längst die Chronologie war — und die Adresse wurde an
// gut fünfzehn Stellen von Hand zusammengesetzt (Mails, Benachrichtigungen,
// Exporte, das PDF der Missionsakte, Redirects nach dem Speichern, die
// Übersichten der Spielleitung). Beim nächsten Umzug wäre wieder jede davon
// einzeln zu finden gewesen.
//
// Bewusst OHNE "server-only": dieselben Funktionen bauen Links im Browser
// (Listen, Karten) und absolute URLs auf dem Server (Mail, PDF) — dort mit
// der Basis-Adresse davor.

// Die Chronologie ist die Übersicht ALLER datierten Inhalte und zugleich die
// Missions-Übersicht (siehe TimelineView).
export const CHRONOLOGY_PATH = "/chronologie";

// Unter diesem Präfix liegen die Missionsseiten — es ist zugleich die
// Kategorie-Adresse der Ereignisart „Mission" (/chronologie/mission), die
// Mission selbst hängt eine Ebene tiefer.
export const MISSION_PATH = `${CHRONOLOGY_PATH}/mission`;

export function missionHref(slug: string): string {
  return `${MISSION_PATH}/${slug}`;
}

export function missionLogHref(missionSlug: string, logSlug: string): string {
  return `${MISSION_PATH}/${missionSlug}/${logSlug}`;
}

// Die Chronologie, auf eine Ereignisart eingeschränkt. Ohne Angabe (oder für
// eine unbekannte Art) die ungefilterte Seite.
export function chronologyCategoryHref(category?: string | null): string {
  return category ? `${CHRONOLOGY_PATH}/${category}` : CHRONOLOGY_PATH;
}

// Die Kategorie-Adressen kollidieren nicht mit dem Umfang-Umschalter der
// Chronologie: „missions" und „all" sind Umfänge, keine Ereignisarten, und
// dürfen deshalb nie als Kategorie-Segment auftauchen.
//
// Bewusst als Literal statt aus TIMELINE_SCOPES abgeleitet: dieses Modul wird
// auch von den Ingest-Skripten außerhalb von Next importiert und soll dafür
// ohne jede weitere Abhängigkeit auskommen. Ein Test in contentRoutes.test.ts
// hält die Liste mit TIMELINE_SCOPES deckungsgleich.
export const RESERVED_CHRONOLOGY_SEGMENTS: readonly string[] = [
  "missions",
  "all",
];

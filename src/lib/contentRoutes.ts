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
// der Basis-Adresse davor. Auch ohne weitere Importe, damit die
// Ingest-Skripte das Modul außerhalb von Next laden können.
//
// NICHT erreichbar sind zwei Stellen, an denen die Adresse in SQL entsteht:
// die UNION-Abfragen in src/lib/adminContent.ts und src/lib/contentImages.ts
// setzen sie als ('/archive/' || slug) zusammen, weil sie über alle
// Inhaltsarten zugleich laufen. Wer hier etwas ändert, muss dort nachsehen.

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

// ── Die Leseseiten der Inhalte ──────────────────────────────────────────
// Vier Inhaltsarten, vier Adressen. Sie standen an rund siebzig Stellen von
// Hand zusammengesetzt; seit dem Umzug der Missionen ging der Missions-Link
// über einen Helfer und der Archiv-Link in derselben Zeile weiter per
// Zeichenkette — halb vereinheitlicht ist schlechter als gar nicht, weil
// niemand mehr sieht, ob das Absicht ist.

export function characterHref(slug: string): string {
  return `/characters/${slug}`;
}

// Das Logbuch einer Figur ist Teil der Chronologie, nicht mehr eine eigene
// Leseseite. Der Name ist der vorhandene Personenfilter der Chronologie.
export function characterLogsHref(characterName: string): string {
  return `${CHRONOLOGY_PATH}?scope=all&category=log&person=${encodeURIComponent(characterName)}`;
}

export function characterSheetHref(slug: string): string {
  return `${characterHref(slug)}/sheet`;
}

export function archiveHref(slug: string): string {
  return `/archive/${slug}`;
}

// Offene Gespräche leben unter /dialogues, abgeschlossene unter /archive
// (siehe toFollowedContent in src/lib/follows.ts).
export function dialogueHref(slug: string): string {
  return `/dialogues/${slug}`;
}

// Die Übersicht der Gespräche ist die Chronologie, Ereignisart „Gespräch" —
// vorher eine eigene Spalte im Charaktere-Bereich (/characters/dialogues).
// Mit Namen einer Figur: dieselbe Ansicht, auf ihre Gespräche eingeschränkt
// (der Personenfilter der Chronologie, wie bei characterLogsHref).
export function dialoguesHref(personName?: string | null): string {
  return personName
    ? `${CHRONOLOGY_PATH}?scope=all&category=dialogue&person=${encodeURIComponent(personName)}`
    : `${CHRONOLOGY_PATH}/dialogue`;
}

// ── Die Bearbeitungsseiten im eigenen Bereich ───────────────────────────
// Adressiert über die ID, nicht den Slug: der Slug kann sich mit dem Titel
// ändern, die Bearbeitungsseite soll unter derselben Adresse bleiben.

export function characterEditHref(id: number | string): string {
  return `/user/characters/${id}`;
}

export function missionEditHref(id: number | string): string {
  return `/user/missions/${id}/edit`;
}

export function missionLogEditHref(id: number | string): string {
  return `/user/mission-logs/${id}/edit`;
}

export function archiveEditHref(id: number | string): string {
  return `/user/archive/${id}/edit`;
}

// ── Die Chronologie ─────────────────────────────────────────────────────

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

// Konstanten und Typen der Versionshistorie — bewusst OHNE "server-only",
// damit das Client-Panel (RevisionsPanel.tsx) sie importieren kann. Der
// DB-Zugriff liegt in contentRevisions.ts, das von hier re-exportiert
// (dieselbe Aufteilung wie contentNoteTypes.ts/contentNotes.ts).

export const REVISION_CONTENT_TYPES = [
  "character",
  "mission",
  "mission_log",
  "archive",
] as const;
export type RevisionContentType = (typeof REVISION_CONTENT_TYPES)[number];

// Wie viele Fassungen je Inhalt aufgehoben werden. Ältere fallen beim
// Speichern der nächsten Version weg — die Historie soll ein Sicherheitsnetz
// gegen versehentliches Überschreiben sein, kein vollständiges Archiv.
export const REVISION_KEEP = 20;

// Länge der Vorschau in der Liste. Der volle Text wird erst beim Aufklappen
// einer Fassung nachgeladen.
export const REVISION_EXCERPT_LENGTH = 220;

export interface ContentRevision {
  id: number;
  title: string | null;
  // Kurzvorschau des damaligen Textes (die Liste lädt nicht alle Volltexte).
  excerpt: string;
  // Zeichenzahl des damaligen Textes — macht ein versehentliches Leeren
  // sofort sichtbar.
  length: number;
  // Wer die Bearbeitung ausgelöst hat, durch die dieser Stand ersetzt wurde.
  // null, wenn das nicht feststellbar war (z.B. Import-Skript).
  editorName: string | null;
  createdAt: string;
}

export function isRevisionContentType(v: string): v is RevisionContentType {
  return (REVISION_CONTENT_TYPES as readonly string[]).includes(v);
}

// Einzeilige Vorschau: Zeilenumbrüche zu Leerzeichen, gekürzt mit Auslassung.
export function revisionExcerpt(
  source: string,
  max = REVISION_EXCERPT_LENGTH,
): string {
  const flat = source.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

// Konstanten, Typen und reine Hilfsfunktionen rund um Notizen/Kommentare —
// bewusst OHNE "server-only", damit auch das Client-Panel (NotesPanel.tsx)
// sie importieren kann. Der DB-Zugriff liegt in contentNotes.ts, das von hier
// re-exportiert; dieselbe Aufteilung wie bei sessionToken.ts/session.ts.

export const NOTE_CONTENT_TYPES = [
  "character",
  "mission",
  "mission_log",
  "archive",
] as const;
export type NoteContentType = (typeof NOTE_CONTENT_TYPES)[number];

export const NOTE_VISIBILITIES = ["private", "group"] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

// Obergrenze wie bei den übrigen Freitextfeldern — verhindert, dass ein
// versehentlich eingefügter Roman in der Zeile landet.
export const NOTE_MAX_LENGTH = 4000;

export interface ContentNote {
  id: number;
  // Rohtext (Markdown), wie er gespeichert ist.
  body: string;
  // Derselbe Text als bereinigtes HTML — die Anzeige rendert Markdown, das
  // Eingabefeld arbeitet auf dem Rohtext (siehe listNotes).
  bodyHtml: string;
  visibility: NoteVisibility;
  authorId: number;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  // Darf der aktuelle Betrachter diese Notiz bearbeiten/löschen?
  canEdit: boolean;
}

export function isNoteContentType(v: string): v is NoteContentType {
  return (NOTE_CONTENT_TYPES as readonly string[]).includes(v);
}

export function isNoteVisibility(v: string): v is NoteVisibility {
  return (NOTE_VISIBILITIES as readonly string[]).includes(v);
}

// Kürzt und normalisiert den Text. Gibt null zurück, wenn nach dem Trimmen
// nichts übrig bleibt — leere Notizen werden nicht gespeichert.
export function normalizeNoteBody(raw: string): string | null {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) return null;
  return body.slice(0, NOTE_MAX_LENGTH);
}

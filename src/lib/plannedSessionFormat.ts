// Anzeige- und Prüf-Helfer für die geplanten Spieltermine — ohne
// Datenbankzugriff, damit sie sich einzeln prüfen lassen und auch im Browser
// verwendbar sind (die Zusage-Knöpfe sind eine Client-Komponente).

import type { PlannedSession, RsvpResponse } from "@/lib/plannedSessionTypes";

export interface PlannedSessionFormInput {
  // Ein einziges Feld aus <input type="datetime-local">: „2026-06-12T19:30".
  scheduledAt: string;
  title: string;
  location: string;
  notes: string;
  characterIds: string[];
}

export type ParseResult =
  | {
      ok: true;
      scheduledAt: string;
      title: string;
      location: string;
      notes: string;
      characterIds: number[];
    }
  | { ok: false; error: string };

// Datum und Uhrzeit kommen als EIN Wert aus dem datetime-local-Feld. Die
// Sekunden sind optional — Firefox liefert „…T19:30", Chrome kann
// „…T19:30:00" schicken.
const DATETIME_LOCAL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/;

export function parsePlannedSession(
  input: PlannedSessionFormInput,
): ParseResult {
  const match = DATETIME_LOCAL.exec(input.scheduledAt.trim());
  if (!match) {
    return { ok: false, error: "Bitte Datum und Uhrzeit angeben." };
  }
  const [, date, time] = match;
  const title = input.title.trim();
  if (title.length > 200) {
    return { ok: false, error: "Der Titel ist zu lang (höchstens 200 Zeichen)." };
  }
  // Ohne Zeitzonen-Angabe interpretiert Postgres den Zeitstempel in der
  // Server-Zeitzone; die Runde spielt in einer Zeitzone, das genügt.
  const scheduledAt = `${date} ${time}`;
  if (Number.isNaN(new Date(`${date}T${time}`).getTime())) {
    return { ok: false, error: "Diesen Zeitpunkt gibt es nicht." };
  }
  const characterIds: number[] = [];
  for (const raw of input.characterIds) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, error: "Ungültige Auswahl der Teilnehmenden." };
    }
    if (!characterIds.includes(id)) characterIds.push(id);
  }
  return {
    ok: true,
    scheduledAt,
    title,
    location: input.location.trim().slice(0, 200),
    notes: input.notes.trim().slice(0, 2000),
    characterIds,
  };
}

// Der Wert für <input type="datetime-local"> aus dem, was die Datenbank
// liefert („2026-06-12 19:30:00+00"). Ohne die Umschrift bliebe das Feld beim
// Ändern leer.
export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// „Freitag, 12. Juni 2026, 19:30 Uhr"
//
// Postgres liefert timestamptz::text als „2026-06-12 19:30:00+00" — mit
// Leerzeichen statt T und mit zweistelligem Zonen-Offset ohne Minuten. Beides
// versteht Date nicht zuverlässig; ohne die Umschrift stand hier der rohe
// Datenbankwert.
export function formatSessionMoment(iso: string): string {
  const normalized = iso
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}, ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

// Wie viele haben zu-, wie viele abgesagt.
export function countRsvps(session: Pick<PlannedSession, "rsvps">): {
  yes: number;
  no: number;
} {
  let yes = 0;
  let no = 0;
  for (const r of session.rsvps) {
    if (r.response === "yes") yes++;
    else no++;
  }
  return { yes, no };
}

// Die eigene Antwort, falls es eine gibt. „Noch offen" ist die Abwesenheit
// einer Antwort, kein eigener Wert.
export function ownResponse(
  session: Pick<PlannedSession, "rsvps">,
  userId: number | null,
): RsvpResponse | null {
  if (userId === null) return null;
  return session.rsvps.find((r) => r.userId === userId)?.response ?? null;
}

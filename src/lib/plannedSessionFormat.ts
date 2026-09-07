// Anzeige- und Prüf-Helfer für die geplanten Spieltermine — ohne
// Datenbankzugriff, damit sie sich einzeln prüfen lassen und auch im Browser
// verwendbar sind (die Zusage-Knöpfe sind eine Client-Komponente).

import type { PlannedSession, RsvpResponse } from "@/lib/plannedSessionTypes";

export interface PlannedSessionFormInput {
  date: string;
  time: string;
  title: string;
  location: string;
  notes: string;
}

export type ParseResult =
  | { ok: true; scheduledAt: string; title: string; location: string; notes: string }
  | { ok: false; error: string };

// Datum und Uhrzeit kommen getrennt aus dem Formular (zwei native Felder
// statt eines datetime-local: das liest sich auf dem Handy besser und ist
// für die Spielleitung schneller zu tippen).
export function parsePlannedSession(
  input: PlannedSessionFormInput,
): ParseResult {
  const date = input.date.trim();
  const time = input.time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Bitte ein Datum angeben." };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, error: "Bitte eine Uhrzeit angeben (z.B. 19:30)." };
  }
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
  return {
    ok: true,
    scheduledAt,
    title,
    location: input.location.trim().slice(0, 200),
    notes: input.notes.trim().slice(0, 2000),
  };
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

export function formatISODate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Postgres liefert TIMESTAMPTZ per ::text als „2026-09-16 10:00:00+00" —
// mit Leerzeichen statt „T" und mit zweistelligem Zonen-Offset ohne Minuten.
// Node parst das zufällig noch, strengere Browser-Engines (Safari) nicht: dort
// entstünde NaN und damit ein Unterschied zwischen Server-Render und
// Hydration. Deshalb vor dem Parsen in echtes ISO 8601 umschreiben.
//
// Bewusst als vollständiges Muster statt als zwei replace()-Aufrufe wie in
// formatSessionMoment (src/lib/plannedSessionFormat.ts): ein bloßes
// /([+-]\d{2})$/ trifft auch den Tag eines reinen Datums („2026-09-16" →
// „2026-09-16:00", Invalid Date). Alles, was nicht exakt so aussieht, geht
// unverändert an Date — eine echte ISO-Zeichenkette braucht hier nichts.
const PG_TIMESTAMPTZ =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)([+-]\d{2})$/;

function toDate(value: Date | string): Date {
  if (typeof value !== "string") return value;
  const match = PG_TIMESTAMPTZ.exec(value);
  return new Date(
    match ? `${match[1]}T${match[2]}${match[3]}:00` : value,
  );
}

// Maschinenlesbare ISO-8601-Fassung desselben Zeitpunkts — für das
// dateTime-Attribut eines <time>-Elements, das den Wert ja nicht in der
// Postgres-Schreibweise tragen darf. Leerstring, wenn nicht parsebar (das
// Attribut entfällt dann sinnvollerweise).
export function toIsoDateTime(date: Date | string | null): string {
  if (!date) return "";
  const d = toDate(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// Für TIMESTAMPTZ-Felder (created_at, last_login_at, ...) mit Uhrzeit,
// anders als formatISODate oben (reines Datum, z.B. In-Story-Ereignisse).
// timeZone explizit gesetzt: ohne sie nutzt toLocaleString die Zeitzone der
// Laufzeitumgebung (auf Netlify UTC), nicht die eines deutschen Nutzers —
// Zeiten wurden dadurch 1-2h (CET/CEST) falsch angezeigt.
export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

// Wie formatDateTime, aber kompakt („16.09.2026, 12:00") — für Stellen, an
// denen der Zeitstempel nur eine kleine Nebenangabe ist und ein
// ausgeschriebener Monatsname die Zeile sprengen würde (Nachrichten-Karten
// laufender Gespräche, siehe DialogueThread.tsx).
export function formatDateTimeShort(date: Date | string | null): string {
  if (!date) return "—";
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

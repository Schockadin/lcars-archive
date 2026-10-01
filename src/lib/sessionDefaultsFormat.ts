export type SessionWeekParity = "odd" | "even";

export interface SessionDefaults {
  weekday: number;
  weekParity: SessionWeekParity;
  time: string;
  location: string;
}

export const DEFAULT_SESSION_DEFAULTS: SessionDefaults = {
  weekday: 0,
  weekParity: "odd",
  time: "16:00",
  location: "David",
};

export const SESSION_WEEKDAYS = [
  { value: 0, label: "Sonntag" },
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
] as const;

const SESSION_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isSessionDefaultTime(value: string): boolean {
  return SESSION_TIME_PATTERN.test(value);
}

// Wochennummer nach ISO 8601. Der Donnerstag bestimmt das ISO-Jahr und die
// Nummerierung startet mit der Woche, die den 4. Januar enthält.
function isoWeekNumber(date: Date): number {
  const thursday = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const isoWeekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - isoWeekday);

  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstIsoWeekday = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstIsoWeekday);

  return (
    1 +
    Math.round(
      (thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
  );
}

// Liefert den nächsten lokalen Termin, der Wochentag und ISO-KW-Parität
// erfüllt. Heute zählt mit, solange die voreingestellte Uhrzeit noch kommt.
export function nextSessionDateTime(
  defaults: SessionDefaults,
  now: Date = new Date(),
): string {
  const [hours, minutes] = defaults.time.split(":").map(Number);
  const scheduledMinute = hours * 60 + minutes;
  const currentMinute =
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  for (let offset = 0; offset <= 28; offset++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
    );
    if (date.getDay() !== defaults.weekday) continue;

    const parity: SessionWeekParity =
      isoWeekNumber(date) % 2 === 0 ? "even" : "odd";
    if (parity !== defaults.weekParity) continue;
    if (offset === 0 && scheduledMinute < currentMinute) continue;

    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${defaults.time}`;
  }

  // Eine passende ISO-Woche wiederholt sich spätestens nach vier Wochen.
  // Dieser Zweig schützt gegen fehlerhafte, außerhalb des Formulars gelieferte
  // Einstellungen und liefert einen gültigen datetime-local-Wert.
  const fallback = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${fallback.getFullYear()}-${pad(fallback.getMonth() + 1)}-${pad(fallback.getDate())}T${defaults.time}`;
}


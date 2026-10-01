import "server-only";
import sql from "@/lib/db";
import {
  DEFAULT_SESSION_DEFAULTS,
  isSessionDefaultTime,
  type SessionDefaults,
  type SessionWeekParity,
} from "@/lib/sessionDefaultsFormat";

type SessionDefaultsRow = {
  session_default_weekday: number;
  session_default_week_parity: string;
  session_default_time: string;
  session_default_location: string;
};

// Kampagnenweite Vorbelegung für neue Termine. Ohne gespeicherte Zeile oder
// bei ungültigen Alt-/Admin-Daten gelten die eingebauten Vorgaben.
export async function getSessionDefaults(): Promise<SessionDefaults> {
  const [row] = await sql<SessionDefaultsRow[]>`
    SELECT
      session_default_weekday,
      session_default_week_parity,
      session_default_time,
      session_default_location
    FROM campaign_settings
    WHERE id = TRUE
  `;

  if (!row) return { ...DEFAULT_SESSION_DEFAULTS };

  return {
    weekday:
      Number.isInteger(row.session_default_weekday) &&
      row.session_default_weekday >= 0 &&
      row.session_default_weekday <= 6
        ? row.session_default_weekday
        : DEFAULT_SESSION_DEFAULTS.weekday,
    weekParity:
      row.session_default_week_parity === "even" ||
      row.session_default_week_parity === "odd"
        ? (row.session_default_week_parity as SessionWeekParity)
        : DEFAULT_SESSION_DEFAULTS.weekParity,
    time: isSessionDefaultTime(row.session_default_time)
      ? row.session_default_time
      : DEFAULT_SESSION_DEFAULTS.time,
    location:
      typeof row.session_default_location === "string"
        ? row.session_default_location
        : DEFAULT_SESSION_DEFAULTS.location,
  };
}

export async function saveSessionDefaults(
  defaults: SessionDefaults,
): Promise<void> {
  await sql`
    INSERT INTO campaign_settings (
      id,
      session_default_weekday,
      session_default_week_parity,
      session_default_time,
      session_default_location,
      updated_at
    )
    VALUES (
      TRUE,
      ${defaults.weekday},
      ${defaults.weekParity},
      ${defaults.time},
      ${defaults.location},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      session_default_weekday = ${defaults.weekday},
      session_default_week_parity = ${defaults.weekParity},
      session_default_time = ${defaults.time},
      session_default_location = ${defaults.location},
      updated_at = NOW()
  `;
}


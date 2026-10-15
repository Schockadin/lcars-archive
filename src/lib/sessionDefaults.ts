import "server-only";
import { eq, sql } from "drizzle-orm";
import orm from "@/lib/orm";
import { campaignSettings } from "@/lib/ormSchema";
import {
  DEFAULT_SESSION_DEFAULTS,
  isSessionDefaultTime,
  type SessionDefaults,
  type SessionWeekParity,
} from "@/lib/sessionDefaultsFormat";

// Kampagnenweite Vorbelegung für neue Termine. Ohne gespeicherte Zeile oder
// bei ungültigen Alt-/Admin-Daten gelten die eingebauten Vorgaben.
export async function getSessionDefaults(): Promise<SessionDefaults> {
  const [row] = await orm
    .select({
      weekday: campaignSettings.sessionDefaultWeekday,
      weekParity: campaignSettings.sessionDefaultWeekParity,
      time: campaignSettings.sessionDefaultTime,
      location: campaignSettings.sessionDefaultLocation,
    })
    .from(campaignSettings)
    .where(eq(campaignSettings.id, true));

  if (!row) return { ...DEFAULT_SESSION_DEFAULTS };

  return {
    weekday:
      Number.isInteger(row.weekday) && row.weekday >= 0 && row.weekday <= 6
        ? row.weekday
        : DEFAULT_SESSION_DEFAULTS.weekday,
    weekParity:
      row.weekParity === "even" || row.weekParity === "odd"
        ? (row.weekParity as SessionWeekParity)
        : DEFAULT_SESSION_DEFAULTS.weekParity,
    time: isSessionDefaultTime(row.time)
      ? row.time
      : DEFAULT_SESSION_DEFAULTS.time,
    location:
      typeof row.location === "string"
        ? row.location
        : DEFAULT_SESSION_DEFAULTS.location,
  };
}

export async function saveSessionDefaults(
  defaults: SessionDefaults,
): Promise<void> {
  const values = {
    sessionDefaultWeekday: defaults.weekday,
    sessionDefaultWeekParity: defaults.weekParity,
    sessionDefaultTime: defaults.time,
    sessionDefaultLocation: defaults.location,
  };
  await orm
    .insert(campaignSettings)
    .values({ id: true, ...values })
    .onConflictDoUpdate({
      target: campaignSettings.id,
      set: { ...values, updatedAt: sql`NOW()` },
    });
}

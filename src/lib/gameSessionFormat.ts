// Prüfung der Session-Eingaben (/gm/sessions) — DB-frei und ohne
// "server-only", nach dem Vorbild von campaignFormat.ts/missionFormat.ts:
// dieselbe Funktion nutzen die Server-Action (verbindlich) und die Tests.
// Der Datenzugriff liegt in src/lib/gameSessions.ts.

export const SESSION_TITLE_MAX = 200;
export const SESSION_NOTES_MAX = 10000;
export const SESSION_AP_MAX = 999;

export interface GameSessionInput {
  sessionDate: string;
  title: string;
  sessionAp: number;
  bonusAp: number;
  notes: string;
  characterIds: number[];
}

export type GameSessionValidation =
  | { ok: true; value: GameSessionInput }
  | { ok: false; error: string };

// ISO-Datum (YYYY-MM-DD) aus <input type="date">. Zusätzlich zur Form wird
// geprüft, ob es das Datum überhaupt gibt — "2026-02-31" passt aufs Muster,
// ist aber kein Tag.
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseAp(raw: string, label: string): number | string {
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 0 || value > SESSION_AP_MAX) {
    return `${label} muss eine ganze Zahl zwischen 0 und ${SESSION_AP_MAX} sein.`;
  }
  return value;
}

export function validateGameSessionInput(raw: {
  sessionDate: string;
  title: string;
  sessionAp: string;
  bonusAp: string;
  notes: string;
  characterIds: string[];
}): GameSessionValidation {
  const sessionDate = raw.sessionDate.trim();
  if (!isIsoDate(sessionDate)) {
    return { ok: false, error: "Bitte ein gültiges Datum angeben." };
  }

  const title = raw.title.trim();
  if (title.length > SESSION_TITLE_MAX) {
    return { ok: false, error: `Titel zu lang (max. ${SESSION_TITLE_MAX} Zeichen).` };
  }

  const sessionAp = parseAp(raw.sessionAp, "Session-AP");
  if (typeof sessionAp === "string") return { ok: false, error: sessionAp };
  const bonusAp = parseAp(raw.bonusAp, "Bonus-AP");
  if (typeof bonusAp === "string") return { ok: false, error: bonusAp };

  const notes = raw.notes.trim();
  if (notes.length > SESSION_NOTES_MAX) {
    return { ok: false, error: `Notizen zu lang (max. ${SESSION_NOTES_MAX} Zeichen).` };
  }

  // Duplikate raus: ein doppelt geschicktes Feld würde denselben Charakter
  // sonst zweimal gutgeschrieben bekommen.
  const characterIds = [...new Set(raw.characterIds.map(Number))];
  if (characterIds.some((id) => !Number.isInteger(id))) {
    return { ok: false, error: "Ungültige Charakterauswahl." };
  }
  // Eine Session ohne Teilnehmende ist erlaubt (reiner Notizeintrag), aber
  // dann darf es auch nichts zu verteilen geben — sonst gingen die AP
  // kommentarlos ins Leere.
  if (characterIds.length === 0 && sessionAp + bonusAp > 0) {
    return {
      ok: false,
      error: "Ohne ausgewählte Charaktere lassen sich keine AP gutschreiben.",
    };
  }

  return {
    ok: true,
    value: { sessionDate, title, sessionAp, bonusAp, notes, characterIds },
  };
}

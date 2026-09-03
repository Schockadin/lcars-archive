import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  SCALAR_NUMBER_FIELDS,
  parseCharacterStats,
} from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";
import type { NumberFieldSpec } from "@/lib/characterStats";

// Die Werte-Formulare (Assistent und Werte-Panel) schicken den kompletten
// Wertesatz als EIN JSON-Feld statt als vierzig einzelne Formularfelder: der
// Editor führt sie ohnehin als zusammenhängenden State (Listen, Talente,
// Budget-Rechnung), und vierzig Hidden-Inputs wären nur eine zweite, leicht
// auseinanderlaufende Darstellung derselben Daten.
//
// Vertraut wird dem Payload nicht: parseCharacterStats normalisiert ihn
// tolerant auf die vollständige Form (unbekannte Felder fliegen raus, kaputte
// Werte werden null). Genau das ist hier aber eine Falle — ein vertippter
// Attributswert (99) käme als „nicht gepflegt" durch, statt als Fehler. Diese
// Funktion prüft deshalb ZUSÄTZLICH, ob jede im Payload gesetzte Zahl die
// Normalisierung überlebt hat, und meldet sonst das betroffene Feld.

export type StatsPayloadResult = { stats: CharacterStats } | { error: string };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// „Im Payload stand etwas, das keine gültige Zahl in diesem Feld ist" — leer
// (null, undefined, "") gilt als nicht gepflegt und ist erlaubt.
function isFilled(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  return !(typeof raw === "string" && raw.trim() === "");
}

function rangeError<K extends string>(
  field: NumberFieldSpec<K>,
  raw: unknown,
  normalized: number | null,
): string | null {
  if (!isFilled(raw) || normalized !== null) return null;
  return `${field.label}: bitte eine ganze Zahl zwischen ${field.min} und ${field.max} angeben.`;
}

export function parseStatsPayload(raw: unknown): StatsPayloadResult {
  let source: unknown = raw;
  if (typeof raw === "string") {
    // Ein leeres Feld heißt „keine Werte mitgeschickt" — das ist kein Fehler,
    // sondern ein Bogen ohne gepflegte Werte.
    const trimmed = raw.trim();
    if (!trimmed) return { stats: parseCharacterStats({}) };
    try {
      source = JSON.parse(trimmed);
    } catch {
      return { error: "Die Werte konnten nicht gelesen werden." };
    }
  }

  const record = asRecord(source);
  const stats = parseCharacterStats(record);

  const attributesSource = asRecord(record.attributes);
  for (const field of ATTRIBUTE_FIELDS) {
    const error = rangeError(
      field,
      attributesSource[field.key],
      stats.attributes[field.key],
    );
    if (error) return { error };
  }

  const departmentsSource = asRecord(record.departments);
  for (const field of DEPARTMENT_FIELDS) {
    const error = rangeError(
      field,
      departmentsSource[field.key],
      stats.departments[field.key],
    );
    if (error) return { error };
  }

  for (const field of SCALAR_NUMBER_FIELDS) {
    const error = rangeError(field, record[field.key], stats[field.key]);
    if (error) return { error };
  }

  return { stats };
}

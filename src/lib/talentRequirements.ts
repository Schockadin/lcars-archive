// Prüft die Voraussetzung eines Talents gegen die Werte eines Charakters —
// DB-frei und ohne "server-only", damit die Auswahlliste (Client) und die
// Tests dieselbe Logik nutzen.
//
// Die Voraussetzungen stammen als Freitext aus dem Regelwerk
// (scripts/seed/talents.json) und folgen einer überschaubaren Grammatik:
//
//   "Control 9+"                          ein Zahlenwert
//   "Command 2+ and Medicine 3+"          UND (auch "und", "&", ", ")
//   "Engineering 3+ or Science 3+"        ODER
//   "Engineering 5"                       Zahl ohne Plus (exakt oder höher)
//   "Vulcan"                              Spezies
//   "Science 3+ and Testing a Theory"     ein anderes Talent
//   "Main Character", "GM's discretion"   nicht maschinell prüfbar
//
// Was sich nicht entscheiden lässt, gilt bewusst als „unbekannt" und NICHT als
// „nicht erfüllt": ein Talent zu verstecken, dessen Voraussetzung die App nur
// nicht versteht, wäre der schlimmere Fehler.
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
} from "@/lib/characterStats";
import { parseTalentEntry } from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";

export type RequirementStatus = "met" | "unmet" | "unknown";

export interface RequirementCheck {
  status: RequirementStatus;
  // Klartext der Bedingungen, die nachweislich NICHT erfüllt sind.
  unmet: string[];
  // Klartext der Bedingungen, die die App nicht entscheiden kann.
  unchecked: string[];
}

export interface RequirementContext {
  stats: CharacterStats;
  // Spezies des Charakters (steht an der Akte, nicht in den Werten).
  species: string | null;
}

// Zahlenwerte, die in Voraussetzungen vorkommen: die sechs Attribute und die
// sechs Disziplinen, jeweils unter ihrem englischen Originalbegriff.
const NUMERIC_KEYS = new Map<string, { group: "attributes" | "departments"; key: string }>([
  ...ATTRIBUTE_FIELDS.map(
    (field) =>
      [
        (field.original ?? field.label).toLowerCase(),
        { group: "attributes" as const, key: field.key as string },
      ] as const,
  ),
  ...DEPARTMENT_FIELDS.map(
    (field) =>
      [
        (field.original ?? field.label).toLowerCase(),
        { group: "departments" as const, key: field.key as string },
      ] as const,
  ),
]);

// Spezies, die im Regeltext als Voraussetzung auftauchen — mit den deutschen
// Schreibweisen, die in der Runde an den Akten stehen. Steht die Spezies eines
// Charakters nicht in dieser Tabelle, bleibt eine Spezies-Voraussetzung
// „unbekannt" (siehe oben) statt fälschlich „nicht erfüllt".
const SPECIES_SYNONYMS: Record<string, string[]> = {
  aenar: ["aenar"],
  andorian: ["andorian", "andorianer", "andorianerin"],
  bajoran: ["bajoran", "bajoraner", "bajoranerin"],
  betazoid: ["betazoid", "betazoide", "betazoidin"],
  cardassian: ["cardassian", "cardassianer", "cardassianerin", "kardassianer"],
  denobulan: ["denobulan", "denobulaner", "denobulanerin"],
  ferengi: ["ferengi"],
  human: ["human", "mensch", "menschin", "terraner", "terranerin"],
  klingon: ["klingon", "klingone", "klingonin"],
  orion: ["orion", "orioner", "orionerin", "orionin"],
  romulan: ["romulan", "romulaner", "romulanerin"],
  tellarite: ["tellarite", "tellarit", "tellaritin"],
  trill: ["trill"],
  vulcan: ["vulcan", "vulkanier", "vulkanierin"],
};

const SPECIES_BY_SYNONYM = new Map<string, string>();
for (const [canonical, synonyms] of Object.entries(SPECIES_SYNONYMS)) {
  for (const synonym of synonyms) SPECIES_BY_SYNONYM.set(synonym, canonical);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// „Orion female" → Spezies orion (das „female" prüft die App nicht).
function speciesOfClause(clause: string): string | null {
  const words = normalize(clause).split(" ");
  for (const word of words) {
    const canonical = SPECIES_BY_SYNONYM.get(word);
    if (canonical) return canonical;
  }
  return null;
}

type ClauseResult = RequirementStatus;

function checkClause(clause: string, context: RequirementContext): ClauseResult {
  const text = clause.trim();
  if (!text) return "unknown";

  // "Control 9+" / "Engineering 5"
  const numeric = /^([A-Za-zÄÖÜäöüß' ]+?)\s+(\d+)\+?$/.exec(text);
  if (numeric) {
    const field = NUMERIC_KEYS.get(normalize(numeric[1]));
    if (field) {
      const values = (
        field.group === "attributes"
          ? context.stats.attributes
          : context.stats.departments
      ) as unknown as Record<string, number | null>;
      const current = values[field.key];
      // Noch nicht gepflegt → unbekannt: der Wert existiert, er steht nur
      // (noch) nicht auf dem Bogen.
      if (current === null || current === undefined) return "unknown";
      return current >= Number(numeric[2]) ? "met" : "unmet";
    }
  }

  // Spezies.
  const species = speciesOfClause(text);
  if (species) {
    const own = context.species ? speciesOfClause(context.species) : null;
    if (!own) return "unknown";
    return own === species ? "met" : "unmet";
  }

  // Ein anderes Talent als Voraussetzung ("Testing a Theory"). Verglichen wird
  // der Originalname, damit ein umbenanntes Talent weiterhin zählt.
  const owned = context.stats.talents.map((entry) =>
    normalize(parseTalentEntry(entry).original),
  );
  if (owned.includes(normalize(text))) return "met";

  // Alles andere (Merkmale, Rollen, „GM's discretion", Schwerpunkte) kann die
  // App nicht entscheiden. Ein Talent-Vorbedingungstext, den der Charakter
  // nicht führt, landet ebenfalls hier — ohne Katalogabgleich lässt sich nicht
  // unterscheiden, ob es ein Talent oder ein Merkmal ist.
  return "unknown";
}

// Trennt eine Voraussetzung in ihre ODER-Zweige und diese wiederum in
// UND-Bedingungen.
function splitOr(requirement: string): string[] {
  return requirement.split(/\s+(?:or|oder)\s+/i);
}

function splitAnd(branch: string): string[] {
  return branch
    .split(/\s*(?:,|&|\s+and\s+|\s+und\s+)\s*/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

// Ergebnis für eine ganze Voraussetzung. Ohne Voraussetzung ist ein Talent
// immer wählbar.
export function checkTalentRequirement(
  requirement: string | null,
  context: RequirementContext,
): RequirementCheck {
  if (!requirement || !requirement.trim()) {
    return { status: "met", unmet: [], unchecked: [] };
  }

  const branches = splitOr(requirement);
  const results = branches.map((branch) => {
    const clauses = splitAnd(branch);
    const unmet: string[] = [];
    const unchecked: string[] = [];
    for (const clause of clauses) {
      const result = checkClause(clause, context);
      if (result === "unmet") unmet.push(clause);
      else if (result === "unknown") unchecked.push(clause);
    }
    const status: RequirementStatus =
      unmet.length > 0 ? "unmet" : unchecked.length > 0 ? "unknown" : "met";
    return { status, unmet, unchecked };
  });

  // Bei ODER genügt ein erfüllter Zweig; sonst zählt der beste Zweig, damit ein
  // „unbekannt" ein „nicht erfüllt" schlägt (im Zweifel anzeigen).
  const met = results.find((r) => r.status === "met");
  if (met) return { status: "met", unmet: [], unchecked: [] };
  const unknown = results.find((r) => r.status === "unknown");
  if (unknown) return { status: "unknown", unmet: [], unchecked: unknown.unchecked };
  return {
    status: "unmet",
    unmet: results.flatMap((r) => r.unmet),
    unchecked: results.flatMap((r) => r.unchecked),
  };
}

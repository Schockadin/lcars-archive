// Talent-Katalog: Kategorien, Labels und Validierung — die reine, DB-freie
// Hälfte der Talentverwaltung (das Gegenstück mit den Abfragen ist
// src/lib/talents.ts). Bewusst OHNE "server-only", damit die Auswahlliste im
// Charakterbogen (Client-Komponente), die Server-Actions von /gm/talents und
// die Tests dieselben Kategorien und Prüfungen nutzen.
//
// Die Startdaten stammen aus dem Regeltext der Runde und liegen als
// scripts/seed/talents.json im Repo (siehe scripts/seed-talents.ts).

import { ATTRIBUTE_FIELDS, DEPARTMENT_FIELDS } from "@/lib/characterStats";

export const TALENT_CATEGORIES = [
  "general",
  "species",
  "augment",
  "esoteric",
  "command",
  "conn",
  "engineering",
  "security",
  "science",
  "medicine",
] as const;

export type TalentCategory = (typeof TALENT_CATEGORIES)[number];

// Deutsches Label + englischer Originalbegriff — dieselbe zweisprachige
// Beschriftung wie auf dem Charakterbogen (siehe characterStats.ts).
export const TALENT_CATEGORY_LABELS: Record<
  TalentCategory,
  { label: string; original: string }
> = {
  general: { label: "Allgemein", original: "General" },
  species: { label: "Spezies & Kultur", original: "Species & Culture" },
  augment: { label: "Augment & Kybernetik", original: "Augment & Cybernetic" },
  esoteric: { label: "Esoterisch", original: "Esoteric" },
  command: { label: "Kommando", original: "Command" },
  conn: { label: "Steuerung", original: "Conn" },
  engineering: { label: "Technik", original: "Engineering" },
  security: { label: "Sicherheit", original: "Security" },
  science: { label: "Wissenschaft", original: "Science" },
  medicine: { label: "Medizin", original: "Medicine" },
};

export function isTalentCategory(value: string): value is TalentCategory {
  return (TALENT_CATEGORIES as readonly string[]).includes(value);
}

export function talentCategoryLabel(category: string): string {
  return isTalentCategory(category)
    ? TALENT_CATEGORY_LABELS[category].label
    : category;
}

export interface Talent {
  id: number;
  name: string;
  category: TalentCategory;
  // Voraussetzung („Control 9+", „Vulcan", …) — null, wenn es keine gibt.
  requirement: string | null;
  // Rohtext (Markdown), wie er gespeichert ist — das Formular arbeitet damit.
  description: string;
  // Derselbe Text als bereinigtes HTML für Auswahlliste und Spickzettel. Im
  // PDF wird stattdessen der Rohtext über toPdfBlocks zerlegt.
  descriptionHtml: string;
  // true = von der Spielleitung ergänztes Talent (nicht aus dem Regeltext).
  isCustom: boolean;
}

export const TALENT_NAME_MAX = 120;
export const TALENT_REQUIREMENT_MAX = 200;
export const TALENT_DESCRIPTION_MAX = 4000;

export interface TalentInput {
  name: string;
  category: TalentCategory;
  requirement: string | null;
  description: string;
}

export type TalentValidation =
  | { ok: true; value: TalentInput }
  | { ok: false; error: string };

// Einzige Prüfstelle für Talent-Eingaben: /gm/talents nutzt sie in der
// Server-Action, die Tests decken sie direkt ab.
export function validateTalentInput(raw: {
  name: string;
  category: string;
  requirement: string;
  description: string;
}): TalentValidation {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Bitte einen Namen angeben." };
  if (name.length > TALENT_NAME_MAX) {
    return { ok: false, error: `Name zu lang (max. ${TALENT_NAME_MAX} Zeichen).` };
  }
  // Klammern sind im Katalognamen reserviert: auf dem Bogen steht ein
  // umbenanntes Talent als „Neuer Name (Originalname)" (siehe
  // formatTalentEntry/parseTalentEntry). Ein Katalogname MIT Klammern würde
  // beim Zurücklesen als Umbenennung gedeutet und wäre danach für den
  // Dublettencheck und die Voraussetzungs-Prüfung unauffindbar — das Talent
  // ließe sich nicht mehr auswählen. Die Voraussetzung gehört ohnehin ins
  // eigene Feld, aus dem talentOptionLabel die Klammer selbst baut.
  if (/[()]/.test(name)) {
    return {
      ok: false,
      error:
        "Der Name darf keine Klammern enthalten — die Voraussetzung gehört ins Feld „Voraussetzung“.",
    };
  }

  if (!isTalentCategory(raw.category)) {
    return { ok: false, error: "Unbekannte Kategorie." };
  }

  const requirement = raw.requirement.trim();
  if (requirement.length > TALENT_REQUIREMENT_MAX) {
    return {
      ok: false,
      error: `Voraussetzung zu lang (max. ${TALENT_REQUIREMENT_MAX} Zeichen).`,
    };
  }

  const description = raw.description.trim();
  if (!description) return { ok: false, error: "Bitte eine Beschreibung angeben." };
  if (description.length > TALENT_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Beschreibung zu lang (max. ${TALENT_DESCRIPTION_MAX} Zeichen).`,
    };
  }

  return {
    ok: true,
    value: {
      name,
      category: raw.category,
      requirement: requirement || null,
      description,
    },
  };
}

// ── Eigene Namen für Talente ───────────────────────────────────────────
// Ein Talent darf auf dem Bogen anders heißen als im Regeltext (die Runde
// benennt sie gern passend zum Charakter um). Gespeichert wird das im
// Listenfeld characters.metadata.stats.talents als „Neuer Name (Originalname)"
// — dieselbe Form, in der es auch angezeigt wird, und ohne neues Datenfeld.
// Katalognamen enthalten selbst keine Klammern, die Form ist damit eindeutig.

export interface TalentEntry {
  // Was auf dem Bogen steht (bei unbenanntem Talent gleich original).
  name: string;
  // Der Katalogname — daran hängen Voraussetzungs-Prüfung und Dublettencheck.
  original: string;
  // Optionale, für dieses Talent gewählte Abteilung, Attribut oder Schwerpunkt.
  selection?: string;
}

export function formatTalentEntry(original: string, customName: string): string {
  const custom = customName.trim();
  if (!custom || custom === original.trim()) return original.trim();
  return `${custom} (${original.trim()})`;
}

export type TalentSelectionKind = "department" | "attribute" | "focus";

interface TalentSelectionRule {
  name: string;
  kind: TalentSelectionKind;
  // Diese Talente teilen sich ihre Abteilungsauswahl.
  selectionGroup?: string;
}

const TALENT_SELECTION_RULES: readonly TalentSelectionRule[] = [
  { name: "Bold", kind: "department", selectionGroup: "department" },
  { name: "Cautious", kind: "department", selectionGroup: "department" },
  { name: "Collaboration", kind: "department", selectionGroup: "department" },
  { name: "Augmented Ability", kind: "attribute" },
  { name: "Dedicated Focus X", kind: "focus" },
];

const LEGACY_TALENT_NAMES: Record<string, string> = {
  "bold x": "Bold",
  "cautious x": "Cautious",
  "collaboration x": "Collaboration",
  "dedicated focus x": "Dedicated Focus X",
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function catalogTalentName(value: string): string {
  const trimmed = value.trim();
  return LEGACY_TALENT_NAMES[normalize(trimmed)] ?? trimmed;
}

export function talentDisplayName(name: string): string {
  return catalogTalentName(name);
}

export function talentSelectionKind(name: string): TalentSelectionKind | null {
  return (
    TALENT_SELECTION_RULES.find(
      (rule) => normalize(rule.name) === normalize(catalogTalentName(name)),
    )?.kind ?? null
  );
}

// Die Auswahl wird lesbar und verlustfrei mit dem Talent gespeichert.
// Beispiele: „Bold (Command)“ und „Augmented Ability (Control)“.
export function formatTalentSelection(name: string, selection: string): string {
  return `${catalogTalentName(name)} (${selection.trim()})`;
}

function qualifiedTalentCore(
  value: string,
): { original: string; selection: string } | null {
  for (const rule of TALENT_SELECTION_RULES) {
    const prefix = `${rule.name} (`;
    if (!value.startsWith(prefix) || !value.endsWith(")")) continue;
    const selection = value.slice(prefix.length, -1).trim();
    if (selection) return { original: rule.name, selection };
  }
  return null;
}

// Trennt eine äußere Umbenennung von ihrem Originaleintrag. Die Suche zählt
// balancierte Klammern rückwärts, damit „Alias (Bold (Command))“ lesbar bleibt.
function wrappedTalentCore(
  value: string,
): { alias: string; core: string } | null {
  if (!value.endsWith(")")) return null;
  let depth = 0;
  for (let i = value.length - 1; i >= 0; i--) {
    if (value[i] === ")") depth++;
    else if (value[i] === "(") {
      depth--;
      if (depth === 0) {
        const alias = value.slice(0, i).trim();
        const core = value.slice(i + 1, -1).trim();
        return alias && core ? { alias, core } : null;
      }
    }
  }
  return null;
}

export function parseTalentEntry(entry: string): TalentEntry {
  const text = entry.trim();
  const normalizedName = text.replace(
    /\b(Bold|Cautious|Collaboration) X\b/g,
    "$1",
  );

  const qualified = qualifiedTalentCore(text);
  if (qualified) {
    return { name: normalizedName, ...qualified };
  }

  const wrapped = wrappedTalentCore(text);
  if (!wrapped) {
    const original = catalogTalentName(text);
    return { name: normalizedName, original };
  }

  const wrappedQualified = qualifiedTalentCore(wrapped.core);
  if (wrappedQualified) {
    return { name: normalizedName, ...wrappedQualified };
  }

  const original = catalogTalentName(wrapped.core);
  return { name: normalizedName, original };
}

// Anzeigename in Auswahllisten. Die Voraussetzung gehört mit dazu, wenn sie
// ein Talent eindeutig einordnet; eine gewählte Variante wird zusätzlich als
// „Talent (Auswahl)“ im Charaktereintrag gespeichert.
export function talentOptionLabel(talent: Talent): string {
  const name = talentDisplayName(talent.name);
  return talent.requirement ? `${name} (${talent.requirement})` : name;
}

// Verfügbare Auswahloptionen. Abteilungen der drei allgemeinen Talente teilen
// sich denselben Pool; Attribute und Schwerpunkte sind jeweils pro Talent
// eindeutig.
export function availableTalentSelections(
  talentName: string,
  taken: string[],
  focuses: string[] = [],
): string[] {
  const normalizedName = normalize(catalogTalentName(talentName));
  const rule = TALENT_SELECTION_RULES.find(
    (candidate) => normalize(candidate.name) === normalizedName,
  );
  if (!rule) return [];

  const options =
    rule.kind === "department"
      ? DEPARTMENT_FIELDS.map((field) => field.original ?? field.label)
      : rule.kind === "attribute"
        ? ATTRIBUTE_FIELDS.map((field) => field.original ?? field.label)
        : [...new Set(focuses.map((focus) => focus.trim()).filter(Boolean))];

  const used = new Set(
    taken.flatMap((entry) => {
      const parsed = parseTalentEntry(entry);
      if (!parsed.selection) return [];
      const otherRule = TALENT_SELECTION_RULES.find(
        (candidate) => normalize(candidate.name) === normalize(parsed.original),
      );
      const sharesPool =
        rule.selectionGroup !== undefined &&
        rule.selectionGroup === otherRule?.selectionGroup;
      return (sharesPool || normalize(parsed.original) === normalizedName)
        ? [normalize(parsed.selection)]
        : [];
    }),
  );

  return options.filter((option) => !used.has(normalize(option)));
}

// Verbindliche Prüfung für neue Talent-Einträge (Ersterschaffung und AP-
// Steigerung). Bereits vorhandene Alt-Einträge werden vom Aufrufer ausgespart.
export function checkTalentSelection(
  entry: string,
  taken: string[],
  focuses: string[] = [],
): string | null {
  const parsed = parseTalentEntry(entry);
  const kind = talentSelectionKind(parsed.original);
  if (!kind) return null;
  if (!parsed.selection) {
    return `„${parsed.original}“ benötigt eine Auswahl.`;
  }

  const allowed =
    kind === "department"
      ? DEPARTMENT_FIELDS.map((field) => field.original ?? field.label)
      : kind === "attribute"
        ? ATTRIBUTE_FIELDS.map((field) => field.original ?? field.label)
        : focuses;
  if (!allowed.some((option) => normalize(option) === normalize(parsed.selection!))) {
    if (kind === "focus" && focuses.length === 0) {
      return "Für „Dedicated Focus X“ muss zuerst mindestens ein Schwerpunkt eingetragen sein.";
    }
    return `Ungültige Auswahl „${parsed.selection}“ für „${parsed.original}“.`;
  }

  if (!availableTalentSelections(parsed.original, taken, focuses).some(
    (option) => normalize(option) === normalize(parsed.selection!),
  )) {
    return `„${parsed.selection}“ ist für diese Auswahl bereits vergeben.`;
  }
  return null;
}

export function checkTalentSelections(
  entries: string[],
  focuses: string[],
  alreadyStored: string[] = [],
): string | null {
  const stored = new Map<string, number>();
  for (const entry of alreadyStored) {
    const key = normalize(entry);
    stored.set(key, (stored.get(key) ?? 0) + 1);
  }
  const prior: string[] = [];
  for (const entry of entries) {
    const key = normalize(entry);
    const storedCount = stored.get(key) ?? 0;
    if (storedCount > 0) {
      stored.set(key, storedCount - 1);
    } else {
      const error = checkTalentSelection(entry, prior, focuses);
      if (error) return error;
    }
    prior.push(entry);
  }
  return null;
}

// Sortierung für Listen und Auswahlfelder: erst Kategorie in der Reihenfolge
// des Regeltexts, dann alphabetisch. Sprachunabhängig über localeCompare mit
// "de", damit Umlaute dort landen, wo man sie erwartet.
export function byTalentOrder(
  a: Pick<Talent, "category" | "name">,
  b: Pick<Talent, "category" | "name">,
): number {
  const ai = TALENT_CATEGORIES.indexOf(a.category);
  const bi = TALENT_CATEGORIES.indexOf(b.category);
  if (ai !== bi) return ai - bi;
  return a.name.localeCompare(b.name, "de");
}

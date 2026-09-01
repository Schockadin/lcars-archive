// Talent-Katalog: Kategorien, Labels und Validierung — die reine, DB-freie
// Hälfte der Talentverwaltung (das Gegenstück mit den Abfragen ist
// src/lib/talents.ts). Bewusst OHNE "server-only", damit die Auswahlliste im
// Charakterbogen (Client-Komponente), die Server-Actions von /gm/talents und
// die Tests dieselben Kategorien und Prüfungen nutzen.
//
// Die Startdaten stammen aus dem Regeltext der Runde und liegen als
// scripts/seed/talents.json im Repo (siehe scripts/seed-talents.ts).

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
  description: string;
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

// Anzeigename in Auswahllisten und auf dem Charakterbogen. Die Voraussetzung
// gehört mit dazu, weil erst sie ein Talent eindeutig einordnet („Bold X"
// gibt es je Disziplin) — gespeichert wird trotzdem nur der reine Name.
export function talentOptionLabel(talent: Talent): string {
  return talent.requirement ? `${talent.name} (${talent.requirement})` : talent.name;
}

// Sortierung für Listen und Auswahlfelder: erst Kategorie in der Reihenfolge
// des Regeltexts, dann alphabetisch. Sprachunabhängig über localeCompare mit
// "de", damit Umlaute dort landen, wo man sie erwartet.
export function byTalentOrder(a: Talent, b: Talent): number {
  const ai = TALENT_CATEGORIES.indexOf(a.category);
  const bi = TALENT_CATEGORIES.indexOf(b.category);
  if (ai !== bi) return ai - bi;
  return a.name.localeCompare(b.name, "de");
}

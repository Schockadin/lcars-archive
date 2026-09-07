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
}

export function formatTalentEntry(original: string, customName: string): string {
  const custom = customName.trim();
  if (!custom || custom === original.trim()) return original.trim();
  return `${custom} (${original.trim()})`;
}

export function parseTalentEntry(entry: string): TalentEntry {
  const text = entry.trim();
  const match = /^(.*?)\s*\(([^()]+)\)$/.exec(text);
  if (!match) return { name: text, original: text };
  const name = match[1].trim();
  const original = match[2].trim();
  if (!name || !original) return { name: text, original: text };
  return { name: text, original };
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
export function byTalentOrder(
  a: Pick<Talent, "category" | "name">,
  b: Pick<Talent, "category" | "name">,
): number {
  const ai = TALENT_CATEGORIES.indexOf(a.category);
  const bi = TALENT_CATEGORIES.indexOf(b.category);
  if (ai !== bi) return ai - bi;
  return a.name.localeCompare(b.name, "de");
}

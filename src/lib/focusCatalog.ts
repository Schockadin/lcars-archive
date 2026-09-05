// Schwerpunkt-Katalog: Disziplinen, Labels und Validierung — die reine,
// DB-freie Hälfte der Schwerpunktverwaltung (das Gegenstück mit den Abfragen
// ist src/lib/focuses.ts). Bewusst OHNE "server-only", damit die Auswahlliste
// im Charakterbogen (Client-Komponente), die Server-Actions von /gm/focuses
// und die Tests dieselben Disziplinen und Prüfungen nutzen.
//
// Aufgebaut wie talentCatalog.ts — Schwerpunkte sind ab sofort genauso wenig
// frei wählbar wie Talente. Die Startdaten stammen aus dem Regeltext der
// Runde und liegen als scripts/seed/focuses.json im Repo (siehe
// scripts/seed-focuses.ts).

// Dieselben sechs Disziplinen wie DEPARTMENT_FIELDS in characterStats.ts, in
// der Reihenfolge des Regeltexts (dort stehen Wissenschaft und Medizin am
// Ende).
export const FOCUS_DISCIPLINES = [
  "command",
  "conn",
  "engineering",
  "security",
  "science",
  "medicine",
] as const;

export type FocusDiscipline = (typeof FOCUS_DISCIPLINES)[number];

// Deutsches Label + englischer Originalbegriff — dieselbe zweisprachige
// Beschriftung wie auf dem Charakterbogen (siehe characterStats.ts).
export const FOCUS_DISCIPLINE_LABELS: Record<
  FocusDiscipline,
  { label: string; original: string }
> = {
  command: { label: "Kommando", original: "Command" },
  conn: { label: "Steuerung", original: "Conn" },
  engineering: { label: "Technik", original: "Engineering" },
  security: { label: "Sicherheit", original: "Security" },
  science: { label: "Wissenschaft", original: "Science" },
  medicine: { label: "Medizin", original: "Medicine" },
};

export function isFocusDiscipline(value: string): value is FocusDiscipline {
  return (FOCUS_DISCIPLINES as readonly string[]).includes(value);
}

export function focusDisciplineLabel(discipline: string): string {
  return isFocusDiscipline(discipline)
    ? FOCUS_DISCIPLINE_LABELS[discipline].label
    : discipline;
}

export interface Focus {
  id: number;
  name: string;
  discipline: FocusDiscipline;
  // Erläuterung als Rohtext (Markdown) — optional, der Regeltext führt
  // Schwerpunkte nur als Liste. Das Formular arbeitet damit.
  description: string | null;
  // Dieselbe Erläuterung als bereinigtes HTML für die Auswahlliste; null,
  // wenn es keine gibt.
  descriptionHtml: string | null;
  // true = von der Spielleitung ergänzter Schwerpunkt (nicht aus dem
  // Regeltext).
  isCustom: boolean;
}

export const FOCUS_NAME_MAX = 120;
export const FOCUS_DESCRIPTION_MAX = 2000;

export interface FocusInput {
  name: string;
  discipline: FocusDiscipline;
  description: string | null;
}

export type FocusValidation =
  | { ok: true; value: FocusInput }
  | { ok: false; error: string };

// Einzige Prüfstelle für Schwerpunkt-Eingaben: /gm/focuses nutzt sie in der
// Server-Action, die Tests decken sie direkt ab.
export function validateFocusInput(raw: {
  name: string;
  discipline: string;
  description: string;
}): FocusValidation {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Bitte einen Namen angeben." };
  if (name.length > FOCUS_NAME_MAX) {
    return { ok: false, error: `Name zu lang (max. ${FOCUS_NAME_MAX} Zeichen).` };
  }

  if (!isFocusDiscipline(raw.discipline)) {
    return { ok: false, error: "Unbekannte Disziplin." };
  }

  const description = raw.description.trim();
  if (description.length > FOCUS_DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Beschreibung zu lang (max. ${FOCUS_DESCRIPTION_MAX} Zeichen).`,
    };
  }

  return {
    ok: true,
    value: {
      name,
      discipline: raw.discipline,
      description: description || null,
    },
  };
}

// Sortierung für Listen und Auswahlfelder: erst Disziplin in der Reihenfolge
// des Regeltexts, dann alphabetisch — wie byTalentOrder.
export function byFocusOrder(
  a: Pick<Focus, "discipline" | "name">,
  b: Pick<Focus, "discipline" | "name">,
): number {
  const ai = FOCUS_DISCIPLINES.indexOf(a.discipline);
  const bi = FOCUS_DISCIPLINES.indexOf(b.discipline);
  if (ai !== bi) return ai - bi;
  return a.name.localeCompare(b.name, "de");
}

// Auf dem Bogen steht nur der NAME eines Schwerpunkts, nicht die Disziplin —
// so war es schon vor dem Katalog, und so steht es im Regelwerk. Sechs Namen
// kommen in zwei Disziplinen vor („Astrophysics" bei Steuerung und
// Wissenschaft, „Survival" bei Steuerung und Sicherheit, …); für den Bogen
// sind das derselbe Schwerpunkt. Deshalb vergleicht alles, was „schon
// eingetragen" prüft, über den Namen.
export function focusKey(name: string): string {
  return name.trim().toLowerCase();
}

// Alle Disziplinen, unter denen ein Name im Katalog geführt wird — für die
// Anzeige in der Auswahlliste, wo derselbe Name sonst mehrfach erschiene.
export function disciplinesOf(
  focuses: Pick<Focus, "name" | "discipline">[],
  name: string,
): FocusDiscipline[] {
  const key = focusKey(name);
  const out: FocusDiscipline[] = [];
  for (const focus of focuses) {
    if (focusKey(focus.name) === key && !out.includes(focus.discipline)) {
      out.push(focus.discipline);
    }
  }
  return out.sort(
    (a, b) => FOCUS_DISCIPLINES.indexOf(a) - FOCUS_DISCIPLINES.indexOf(b),
  );
}

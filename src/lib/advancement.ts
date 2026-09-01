// Regelwerk der Erfahrungspunkte (AP = Advancement Points) der Runde:
// Kosten fürs Steigern, Budgets der Ersterschaffung und die Prüfung, ob eine
// Steigerung erlaubt und bezahlbar ist.
//
// Bewusst OHNE "server-only" und ohne DB-Bezug: dieselben Funktionen nutzen
// das Formular (Kostenanzeige, Knöpfe aktivieren/deaktivieren), die
// Server-Action (verbindliche Prüfung) und die Tests. Die Buchungen selbst
// liegen in src/lib/characterAp.ts.
import type { CharacterStats } from "@/types/characterStats";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  ATTRIBUTE_RULE,
  DEPARTMENT_RULE,
} from "@/lib/characterStats";

// ── Regelwerk (konfigurierbar) ─────────────────────────────────────────
// Die Zahlen der Runde stehen nicht fest im Code, sondern kommen aus
// campaign_settings.advancement_rules (siehe src/lib/advancementSettings.ts);
// die Spielleitung stellt sie unter /gm/ap ein. Fehlt ein Eintrag, gelten die
// Standardwerte unten. Jede Funktion hier nimmt die Regeln als letztes
// Argument entgegen — mit dem Standard als Default, damit Aufrufstellen ohne
// eigene Regeln (Tests, reine Kostenanzeigen) unverändert funktionieren.
export interface AdvancementRules {
  // Attribut auf einen neuen Wert steigern: (neuer Wert − Mindestwert) × apPerStep.
  // Disziplin auf einen neuen Wert steigern: (neuer Wert) × apPerStep.
  apPerStep: number;
  talentCost: number;
  focusCost: number;
  // Ersterschaffung: statt der 56 bzw. 16 Verteilpunkte des Grundregelwerks
  // stehen AP-Budgets bereit; die Kosten einer Verteilung sind die Summe aller
  // Einzelschritte vom Mindestwert bis zum gewählten Wert.
  creationAttributeBudget: number;
  creationDepartmentBudget: number;
  // Freikontingente der Ersterschaffung (kosten dort keine AP).
  creationFreeValues: number;
  creationFreeTalents: number;
  creationFreeFocuses: number;
  // Vergabe: was eine gespielte Session bzw. ein geschriebenes Logbuch bringt.
  apPerSession: number;
  apPerLogbook: number;
}

export const DEFAULT_ADVANCEMENT_RULES: AdvancementRules = {
  apPerStep: 10,
  talentCost: 20,
  focusCost: 20,
  creationAttributeBudget: 320,
  creationDepartmentBudget: 320,
  creationFreeValues: 4,
  creationFreeTalents: 4,
  creationFreeFocuses: 6,
  apPerSession: 1,
  apPerLogbook: 1,
};

// Feldkatalog für den Regel-Editor unter /gm/ap — eine deklarative Liste, aus
// der sich Formular und Validierung speisen (gleiches Muster wie
// characterStats.ts), damit keine Regel an einer der beiden Stellen fehlt.
export interface AdvancementRuleField {
  key: keyof AdvancementRules;
  label: string;
  hint: string;
  min: number;
  max: number;
}

export const ADVANCEMENT_RULE_FIELDS: AdvancementRuleField[] = [
  { key: "apPerStep", label: "AP je Steigerungsschritt", hint: "Attribut: (neuer Wert − 7) × diesem Faktor. Disziplin: (neuer Wert) × diesem Faktor.", min: 1, max: 100 },
  { key: "talentCost", label: "AP je Talent", hint: "Kosten eines zusätzlichen Talents nach der Erschaffung.", min: 1, max: 500 },
  { key: "focusCost", label: "AP je Schwerpunkt", hint: "Kosten eines zusätzlichen Schwerpunkts nach der Erschaffung.", min: 1, max: 500 },
  { key: "creationAttributeBudget", label: "Erschaffung: AP für Attribute", hint: "Gesamtbudget für die Attributsverteilung.", min: 0, max: 5000 },
  { key: "creationDepartmentBudget", label: "Erschaffung: AP für Disziplinen", hint: "Gesamtbudget für die Disziplinenverteilung.", min: 0, max: 5000 },
  { key: "creationFreeValues", label: "Erschaffung: freie Werte", hint: "Anzahl Werte, die die Erschaffung kostenlos mitbringt.", min: 0, max: 20 },
  { key: "creationFreeTalents", label: "Erschaffung: freie Talente", hint: "Anzahl Talente, die die Erschaffung kostenlos mitbringt.", min: 0, max: 20 },
  { key: "creationFreeFocuses", label: "Erschaffung: freie Schwerpunkte", hint: "Anzahl Schwerpunkte, die die Erschaffung kostenlos mitbringt.", min: 0, max: 20 },
  { key: "apPerSession", label: "AP je gespielter Session", hint: "Vorbelegung beim Anlegen einer Session unter /gm/sessions.", min: 0, max: 100 },
  { key: "apPerLogbook", label: "AP je geschriebenem Logbuch", hint: "Betrag des Schnellknopfs „+Logbuch“ bei der AP-Vergabe.", min: 0, max: 100 },
];

// Tolerantes Einlesen der gespeicherten Regeln (jsonb): unbekannte Schlüssel
// werden ignoriert, fehlende oder unbrauchbare Werte fallen auf den Standard
// zurück. So bleibt ein alter Datenstand nach einer Regel-Erweiterung lesbar.
export function parseAdvancementRules(raw: unknown): AdvancementRules {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rules = { ...DEFAULT_ADVANCEMENT_RULES };
  for (const field of ADVANCEMENT_RULE_FIELDS) {
    const value = source[field.key];
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(num) && num >= field.min && num <= field.max) {
      rules[field.key] = num;
    }
  }
  return rules;
}

export type AdvancementRulesValidation =
  | { ok: true; value: AdvancementRules }
  | { ok: false; error: string };

// Verbindliche Prüfung der Eingaben aus dem Regel-Editor. Anders als
// parseAdvancementRules wird hier NICHT stillschweigend auf den Standard
// zurückgefallen — eine unsinnige Eingabe soll eine Meldung erzeugen.
export function validateAdvancementRules(
  raw: Record<string, string>,
): AdvancementRulesValidation {
  const rules = { ...DEFAULT_ADVANCEMENT_RULES };
  for (const field of ADVANCEMENT_RULE_FIELDS) {
    const value = Number((raw[field.key] ?? "").trim());
    if (!Number.isInteger(value) || value < field.min || value > field.max) {
      return {
        ok: false,
        error: `„${field.label}“ muss eine ganze Zahl zwischen ${field.min} und ${field.max} sein.`,
      };
    }
    rules[field.key] = value;
  }
  return { ok: true, value: rules };
}

// ── Kosten ─────────────────────────────────────────────────────────────
export function attributeStepCost(
  newValue: number,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): number {
  return (newValue - ATTRIBUTE_RULE.min) * rules.apPerStep;
}

export function departmentStepCost(
  newValue: number,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): number {
  return newValue * rules.apPerStep;
}

// ── Ersterschaffung ────────────────────────────────────────────────────
// Kosten, einen einzelnen Wert von seinem Minimum auf `value` zu bringen.
function cumulativeCost(
  value: number | null,
  min: number,
  stepCost: (newValue: number) => number,
): number {
  if (value === null) return 0;
  let total = 0;
  for (let step = min + 1; step <= value; step++) {
    total += stepCost(step);
  }
  return total;
}

export function creationAttributeCost(
  stats: CharacterStats,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): number {
  return ATTRIBUTE_FIELDS.reduce(
    (sum, field) =>
      sum +
      cumulativeCost(stats.attributes[field.key], ATTRIBUTE_RULE.min, (v) =>
        attributeStepCost(v, rules),
      ),
    0,
  );
}

export function creationDepartmentCost(
  stats: CharacterStats,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): number {
  return DEPARTMENT_FIELDS.reduce(
    (sum, field) =>
      sum +
      cumulativeCost(stats.departments[field.key], DEPARTMENT_RULE.min, (v) =>
        departmentStepCost(v, rules),
      ),
    0,
  );
}

export interface CreationBudget {
  attributeCost: number;
  attributeRemaining: number;
  departmentCost: number;
  departmentRemaining: number;
  // true, sobald eines der beiden Budgets überzogen ist.
  overBudget: boolean;
}

// Für die Budget-Anzeige der Ersterschaffung ("Vielleicht habt ihr ja noch den
// ein- oder anderen Punkt frei").
export function creationBudget(
  stats: CharacterStats,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): CreationBudget {
  const attributeCost = creationAttributeCost(stats, rules);
  const departmentCost = creationDepartmentCost(stats, rules);
  return {
    attributeCost,
    attributeRemaining: rules.creationAttributeBudget - attributeCost,
    departmentCost,
    departmentRemaining: rules.creationDepartmentBudget - departmentCost,
    overBudget:
      attributeCost > rules.creationAttributeBudget ||
      departmentCost > rules.creationDepartmentBudget,
  };
}

// ── Steigern nach der Erschaffung ──────────────────────────────────────
export type AdvancementKind = "attribute" | "department" | "talent" | "focus";

export interface AdvancementRequest {
  kind: AdvancementKind;
  // Bei attribute/department: der Schlüssel des Werts (z.B. "control").
  key?: string;
  // Bei talent/focus: der neue Eintrag.
  entry?: string;
}

export interface AdvancementPlan {
  kind: AdvancementKind;
  label: string;
  cost: number;
  // Nur bei attribute/department gesetzt.
  newValue?: number;
}

export type AdvancementCheck =
  | { ok: true; plan: AdvancementPlan }
  | { ok: false; error: string };

// Prüft eine geplante Steigerung gegen Regelgrenzen UND AP-Deckung und liefert
// die Kosten zurück. Einzige Quelle für beide Seiten: das Formular zeigt damit
// Kosten und Sperrgründe an, die Server-Action entscheidet damit verbindlich.
export function checkAdvancement(
  stats: CharacterStats,
  request: AdvancementRequest,
  availableAp: number,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): AdvancementCheck {
  if (request.kind === "talent" || request.kind === "focus") {
    const entry = (request.entry ?? "").trim();
    if (!entry) {
      return {
        ok: false,
        error:
          request.kind === "talent"
            ? "Bitte ein Talent angeben."
            : "Bitte einen Schwerpunkt angeben.",
      };
    }
    const existing =
      request.kind === "talent" ? stats.talents : stats.focuses;
    if (existing.some((e) => e.toLowerCase() === entry.toLowerCase())) {
      return { ok: false, error: `„${entry}" ist bereits eingetragen.` };
    }
    const cost = request.kind === "talent" ? rules.talentCost : rules.focusCost;
    if (cost > availableAp) {
      return { ok: false, error: notEnoughAp(cost, availableAp) };
    }
    return {
      ok: true,
      plan: {
        kind: request.kind,
        label: entry,
        cost,
      },
    };
  }

  const isAttribute = request.kind === "attribute";
  const fields = isAttribute ? ATTRIBUTE_FIELDS : DEPARTMENT_FIELDS;
  const rule = isAttribute ? ATTRIBUTE_RULE : DEPARTMENT_RULE;
  const field = fields.find((f) => f.key === request.key);
  if (!field) {
    return { ok: false, error: "Unbekannter Wert." };
  }

  // Attribute und Disziplinen haben feste Schlüssel; für den generischen
  // Zugriff hier einmal als Record lesen (über unknown, da die beiden Typen
  // keine Index-Signatur haben).
  const values = (isAttribute ? stats.attributes : stats.departments) as unknown as Record<
    string,
    number | null
  >;
  const current = values[field.key];
  if (current === null || current === undefined) {
    return {
      ok: false,
      error: `${field.original ?? field.label} ist noch nicht gepflegt — bitte erst den Startwert eintragen.`,
    };
  }

  const newValue = current + 1;
  if (newValue > rule.max) {
    return {
      ok: false,
      error: `${field.original ?? field.label} steht bereits auf dem Höchstwert ${rule.max}.`,
    };
  }

  // Häufungsgrenzen (ein 12er, zwei 11er bzw. eine 5 und zwei 4er) gegen die
  // Verteilung NACH der Steigerung prüfen.
  const after = Object.values({ ...values, [field.key]: newValue });
  const atMax = after.filter((v) => v === rule.max).length;
  if (atMax > rule.maxAtMax) {
    return {
      ok: false,
      error: `Nur ${rule.maxAtMax}× ${rule.max} erlaubt — dafür müsste ein anderer Wert sinken.`,
    };
  }
  const atSecond = after.filter((v) => v === rule.max - 1).length;
  if (atSecond > rule.maxAtSecond) {
    return {
      ok: false,
      error: `Nur ${rule.maxAtSecond}× ${rule.max - 1} erlaubt — dafür müsste ein anderer Wert sinken.`,
    };
  }

  const cost = isAttribute
    ? attributeStepCost(newValue, rules)
    : departmentStepCost(newValue, rules);
  if (cost > availableAp) {
    return { ok: false, error: notEnoughAp(cost, availableAp) };
  }

  return {
    ok: true,
    plan: {
      kind: request.kind,
      label: `${field.original ?? field.label} ${current} → ${newValue}`,
      cost,
      newValue,
    },
  };
}

function notEnoughAp(cost: number, available: number): string {
  return `Dafür fehlen AP: ${cost} AP nötig, ${available} AP verfügbar.`;
}

// Wendet eine geprüfte Steigerung auf die Werte an — reine Funktion, die
// Persistenz übernimmt der Aufrufer (siehe advanceOwnCharacter).
export function applyAdvancement(
  stats: CharacterStats,
  request: AdvancementRequest,
  plan: AdvancementPlan,
): CharacterStats {
  if (plan.kind === "talent") {
    return { ...stats, talents: [...stats.talents, plan.label] };
  }
  if (plan.kind === "focus") {
    return { ...stats, focuses: [...stats.focuses, plan.label] };
  }
  const key = request.key as string;
  if (plan.kind === "attribute") {
    return {
      ...stats,
      attributes: { ...stats.attributes, [key]: plan.newValue as number },
    };
  }
  return {
    ...stats,
    departments: { ...stats.departments, [key]: plan.newValue as number },
  };
}

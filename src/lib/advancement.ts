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

// ── Kosten ─────────────────────────────────────────────────────────────
// Attribut auf einen neuen Wert steigern: (neuer Wert − 7) × 10 AP.
// Disziplin auf einen neuen Wert steigern: (neuer Wert) × 10 AP.
// Ein Talent oder ein Schwerpunkt: je 20 AP.
export const AP_PER_STEP = 10;
export const TALENT_COST = 20;
export const FOCUS_COST = 20;

export function attributeStepCost(newValue: number): number {
  return (newValue - ATTRIBUTE_RULE.min) * AP_PER_STEP;
}

export function departmentStepCost(newValue: number): number {
  return newValue * AP_PER_STEP;
}

// ── Ersterschaffung ────────────────────────────────────────────────────
// Statt der 56 bzw. 16 Verteilpunkte des Grundregelwerks stehen je 320 AP
// bereit. Die Kosten einer Verteilung sind die Summe aller Einzelschritte vom
// Mindestwert bis zum gewählten Wert — dieselbe Formel wie beim Steigern, nur
// aufsummiert.
export const CREATION_ATTRIBUTE_BUDGET = 320;
export const CREATION_DEPARTMENT_BUDGET = 320;

// Freikontingente der Ersterschaffung (kosten dort keine AP).
export const CREATION_FREE_VALUES = 4;
export const CREATION_FREE_TALENTS = 4;
export const CREATION_FREE_FOCUSES = 6;

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

export function creationAttributeCost(stats: CharacterStats): number {
  return ATTRIBUTE_FIELDS.reduce(
    (sum, field) =>
      sum +
      cumulativeCost(
        stats.attributes[field.key],
        ATTRIBUTE_RULE.min,
        attributeStepCost,
      ),
    0,
  );
}

export function creationDepartmentCost(stats: CharacterStats): number {
  return DEPARTMENT_FIELDS.reduce(
    (sum, field) =>
      sum +
      cumulativeCost(
        stats.departments[field.key],
        DEPARTMENT_RULE.min,
        departmentStepCost,
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
export function creationBudget(stats: CharacterStats): CreationBudget {
  const attributeCost = creationAttributeCost(stats);
  const departmentCost = creationDepartmentCost(stats);
  return {
    attributeCost,
    attributeRemaining: CREATION_ATTRIBUTE_BUDGET - attributeCost,
    departmentCost,
    departmentRemaining: CREATION_DEPARTMENT_BUDGET - departmentCost,
    overBudget:
      attributeCost > CREATION_ATTRIBUTE_BUDGET ||
      departmentCost > CREATION_DEPARTMENT_BUDGET,
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
    const cost = request.kind === "talent" ? TALENT_COST : FOCUS_COST;
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
    ? attributeStepCost(newValue)
    : departmentStepCost(newValue);
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

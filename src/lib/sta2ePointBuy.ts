import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  hasCompleteCreationValues,
  validateCharacterStats,
} from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";

export const STA2E_POINT_BUY_ATTRIBUTE_TOTAL = 56;
export const STA2E_POINT_BUY_DEPARTMENT_TOTAL = 16;
export const STA2E_POINT_BUY_ATTRIBUTE_BASE = 7;
export const STA2E_POINT_BUY_DEPARTMENT_BASE = 1;

export const STA2E_POINT_BUY_BASE_ATTRIBUTES = {
  control: STA2E_POINT_BUY_ATTRIBUTE_BASE,
  daring: STA2E_POINT_BUY_ATTRIBUTE_BASE,
  fitness: STA2E_POINT_BUY_ATTRIBUTE_BASE,
  insight: STA2E_POINT_BUY_ATTRIBUTE_BASE,
  presence: STA2E_POINT_BUY_ATTRIBUTE_BASE,
  reason: STA2E_POINT_BUY_ATTRIBUTE_BASE,
} as const;

export const STA2E_POINT_BUY_BASE_DEPARTMENTS = {
  command: STA2E_POINT_BUY_DEPARTMENT_BASE,
  conn: STA2E_POINT_BUY_DEPARTMENT_BASE,
  engineering: STA2E_POINT_BUY_DEPARTMENT_BASE,
  security: STA2E_POINT_BUY_DEPARTMENT_BASE,
  medicine: STA2E_POINT_BUY_DEPARTMENT_BASE,
  science: STA2E_POINT_BUY_DEPARTMENT_BASE,
} as const;

export interface Sta2ePointBuyTotals {
  attributes: number;
  departments: number;
}

export function sta2ePointBuyTotals(stats: CharacterStats): Sta2ePointBuyTotals {
  return {
    attributes: ATTRIBUTE_FIELDS.reduce(
      (sum, field) => sum + (stats.attributes[field.key] ?? 0),
      0,
    ),
    departments: DEPARTMENT_FIELDS.reduce(
      (sum, field) => sum + (stats.departments[field.key] ?? 0),
      0,
    ),
  };
}

/** Validate the complete STA 2e point-buy distribution before creation is finalized. */
export function checkSta2ePointBuy(stats: CharacterStats): string[] {
  if (stats.creationMethod !== "sta2e-point-buy") return [];
  if (!hasCompleteCreationValues(stats)) {
    return ["Das STA-2e-Punktesystem benötigt sechs Attribute und sechs Disziplinen."];
  }

  const totals = sta2ePointBuyTotals(stats);
  const errors: string[] = [];
  if (totals.attributes !== STA2E_POINT_BUY_ATTRIBUTE_TOTAL) {
    errors.push(`Die Attributsumme muss ${STA2E_POINT_BUY_ATTRIBUTE_TOTAL} betragen (aktuell ${totals.attributes}).`);
  }
  if (totals.departments !== STA2E_POINT_BUY_DEPARTMENT_TOTAL) {
    errors.push(`Die Disziplinensumme muss ${STA2E_POINT_BUY_DEPARTMENT_TOTAL} betragen (aktuell ${totals.departments}).`);
  }
  errors.push(...validateCharacterStats(stats));
  return [...new Set(errors)];
}

// Erschaffung zurücksetzen und wieder abschließen — die reine Logik dahinter.
//
// Die Spielleitung kann einen festgeschriebenen Charakter zurück in die
// Erschaffung schicken (siehe reopenCharacterCreation in characterAp.ts).
// Alles, was NACH der Erschaffung passiert ist, sind Steigerungen: sie werden
// dabei zurückgenommen (Werte fallen auf den Stand der Erschaffung, die AP
// kommen aufs Konto zurück) — aber notiert, damit dieselben Steigerungen beim
// erneuten Abschließen automatisch wieder angewandt werden können.
//
// Bewusst OHNE "server-only" und ohne DB-Bezug (wie advancement.ts): dieselben
// Funktionen nutzen die Server-Actions, die Anzeige und die Tests. Die
// Buchungen selbst liegen in src/lib/characterAp.ts.
import type {
  CharacterStats,
  PendingAdvancement,
} from "@/types/characterStats";
import { ATTRIBUTE_FIELDS, DEPARTMENT_FIELDS } from "@/lib/characterStats";
import {
  applyAdvancement,
  checkAdvancement,
  DEFAULT_ADVANCEMENT_RULES,
  type AdvancementRequest,
  type AdvancementRules,
} from "@/lib/advancement";

// So sieht der Klartext einer Wert-Steigerung im Journal aus — geschrieben von
// checkAdvancement ("Kontrolle 9 → 10"). Aus ihm lassen sich Feld UND der
// Stand VOR der Steigerung zurücklesen, ohne dass es dafür eine zweite,
// parallel zu pflegende Spalte bräuchte.
const STEP_NOTE = /^(.+?)\s+(\d+)\s*→\s*(\d+)$/;

interface ParsedNote {
  kind: PendingAdvancement["kind"];
  key: string | null;
  entry: string | null;
  // Wert vor der Steigerung (nur bei attribute/department).
  previousValue: number | null;
}

// Ordnet eine Steigerungs-Buchung ihrem Ziel zu. Talente und Schwerpunkte
// stehen mit ihrem Eintrag im Journal — welcher von beiden es war, verrät der
// Bogen, auf dem der Eintrag noch steht.
export function parseAdvancementNote(
  note: string | null,
  stats: CharacterStats,
): ParsedNote | null {
  const trimmed = (note ?? "").trim();
  if (!trimmed) return null;

  const step = STEP_NOTE.exec(trimmed);
  if (step) {
    const [, name, from] = step;
    const label = name.trim();
    const matches = (field: { label: string; original?: string }) =>
      (field.original ?? field.label) === label || field.label === label;

    const attribute = ATTRIBUTE_FIELDS.find(matches);
    if (attribute) {
      return {
        kind: "attribute",
        key: attribute.key,
        entry: null,
        previousValue: Number(from),
      };
    }
    const department = DEPARTMENT_FIELDS.find(matches);
    if (department) {
      return {
        kind: "department",
        key: department.key,
        entry: null,
        previousValue: Number(from),
      };
    }
    return null;
  }

  if (stats.talents.includes(trimmed)) {
    return { kind: "talent", key: null, entry: trimmed, previousValue: null };
  }
  if (stats.focuses.includes(trimmed)) {
    return { kind: "focus", key: null, entry: trimmed, previousValue: null };
  }
  return null;
}

// Eine Steigerungs-Buchung des AP-Kontos, so weit hier gebraucht.
export interface AdvancementBooking {
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface CreationResetResult {
  // Werte OHNE die zurückgenommenen Steigerungen, mit der Notiz darüber.
  stats: CharacterStats;
  // Je Rücknahme eine Gutschrift, die der Aufrufer bucht.
  refunds: { label: string; cost: number }[];
  // Buchungen, die sich keinem Ziel zuordnen ließen (z.B. ein Talent, das
  // inzwischen vom Bogen verschwunden ist). Sie bleiben unangetastet — weder
  // wird ein Wert verändert noch AP gutgeschrieben —, der Aufrufer meldet sie.
  unresolved: string[];
}

// Nimmt alle Steigerungen zurück. `bookings` kommt NEUESTE ZUERST (so liefert
// getApAccount das Journal): nur in dieser Richtung führt jeder Schritt auf
// den Stand vor sich selbst zurück, und der letzte Schritt landet damit auf dem
// Stand der Erschaffung.
export function revertAdvancements(
  stats: CharacterStats,
  bookings: AdvancementBooking[],
): CreationResetResult {
  let next = stats;
  const pending: PendingAdvancement[] = [];
  const refunds: { label: string; cost: number }[] = [];
  const unresolved: string[] = [];

  for (const booking of bookings) {
    const label = (booking.note ?? "").trim();
    const parsed = parseAdvancementNote(label, next);
    if (!parsed) {
      if (label) unresolved.push(label);
      continue;
    }

    if (parsed.kind === "attribute") {
      next = {
        ...next,
        attributes: {
          ...next.attributes,
          [parsed.key as string]: parsed.previousValue,
        },
      };
    } else if (parsed.kind === "department") {
      next = {
        ...next,
        departments: {
          ...next.departments,
          [parsed.key as string]: parsed.previousValue,
        },
      };
    } else if (parsed.kind === "talent") {
      next = {
        ...next,
        talents: next.talents.filter((entry) => entry !== parsed.entry),
      };
    } else {
      next = {
        ...next,
        focuses: next.focuses.filter((entry) => entry !== parsed.entry),
      };
    }

    // Die Notiz-Liste wird chronologisch geführt (ältestes zuerst), das
    // Journal läuft rückwärts — deshalb vorne einfügen.
    pending.unshift({
      kind: parsed.kind,
      key: parsed.key,
      entry: parsed.entry,
      label,
      cost: Math.abs(booking.amount),
      recordedAt: booking.createdAt,
    });
    refunds.push({ label, cost: Math.abs(booking.amount) });
  }

  return {
    stats: {
      ...next,
      creationLocked: false,
      // Eine frühere Notiz kann es nicht geben: zurücksetzen lässt sich nur
      // ein festgeschriebener Bogen, und beim Festschreiben wird die Liste
      // geleert (siehe reapplyAdvancements).
      pendingAdvancements: pending,
    },
    refunds,
    unresolved,
  };
}

export interface ReapplyResult {
  // Werte MIT den wieder angewandten Steigerungen; die Notiz ist geleert.
  stats: CharacterStats;
  // Je wieder angewandter Steigerung eine Abbuchung, die der Aufrufer bucht.
  applied: { label: string; cost: number }[];
  // Was nicht mehr ging (AP reichen nicht, Regelgrenze, Eintrag schon
  // vorhanden) — mit dem Grund, damit die Meldung ihn nennen kann.
  skipped: { label: string; error: string }[];
}

// Wendet die notierten Steigerungen wieder an — in der ursprünglichen
// Reihenfolge, damit Schritt für Schritt dieselben Zwischenwerte entstehen.
//
// Gerechnet wird mit den HEUTE geltenden Regeln und dem HEUTIGEN Kontostand,
// nicht mit den damaligen Kosten: zwischen Zurücksetzen und Abschließen kann
// sich beides geändert haben, und geprüft werden muss ohnehin neu (sonst
// entstünde über den Umweg ein Bogen, der die Regelgrenzen verletzt).
export function reapplyAdvancements(
  stats: CharacterStats,
  pending: PendingAdvancement[],
  availableAp: number,
  rules: AdvancementRules = DEFAULT_ADVANCEMENT_RULES,
): ReapplyResult {
  let next = stats;
  let available = availableAp;
  const applied: { label: string; cost: number }[] = [];
  const skipped: { label: string; error: string }[] = [];

  for (const item of pending) {
    const request: AdvancementRequest = {
      kind: item.kind,
      key: item.key ?? undefined,
      entry: item.entry ?? undefined,
    };
    const check = checkAdvancement(next, request, available, rules);
    if (!check.ok) {
      skipped.push({ label: item.label, error: check.error });
      continue;
    }
    next = applyAdvancement(next, request, check.plan);
    available -= check.plan.cost;
    applied.push({ label: check.plan.label, cost: check.plan.cost });
  }

  return {
    stats: { ...next, pendingAdvancements: [] },
    applied,
    skipped,
  };
}

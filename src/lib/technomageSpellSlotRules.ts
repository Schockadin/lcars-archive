export interface TechnomageSpellSlotRules {
  creationBaseSlots: number;
  creationBonusSlots: number;
  reasonBaseline: number;
  reasonModifier: number;
  organellesBonusSlots: number;
  ftlAttunementBonusSlots: number;
  apThreshold: number;
  apBonusSlots: number;
}

export const DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES: TechnomageSpellSlotRules = {
  creationBaseSlots: 5,
  creationBonusSlots: 2.5,
  reasonBaseline: 7,
  reasonModifier: 1,
  organellesBonusSlots: 2.5,
  ftlAttunementBonusSlots: 2.5,
  apThreshold: 20,
  apBonusSlots: 2.5,
};

type RuleField = {
  key: keyof TechnomageSpellSlotRules;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
};

export const TECHNOMAGE_SPELL_SLOT_RULE_FIELDS: RuleField[] = [
  {
    key: "creationBaseSlots",
    label: "Startslots bei Erschaffung",
    hint: "Fester Grundwert vor Erschaffungsbonus und Verstand-Modifikator.",
    min: 0,
    max: 100,
    step: 0.5,
  },
  {
    key: "creationBonusSlots",
    label: "Erschaffungsbonus",
    hint: "Zusätzliche Slots bei Erschaffung.",
    min: 0,
    max: 100,
    step: 0.5,
  },
  {
    key: "reasonBaseline",
    label: "Verstand-Basiswert",
    hint: "Ab diesem Verstand-Wert greift kein Zu- oder Abschlag.",
    min: 0,
    max: 20,
    step: 1,
    integer: true,
  },
  {
    key: "reasonModifier",
    label: "Slots je Verstand-Punkt",
    hint: "Faktor für jeden Punkt über oder unter dem Basiswert.",
    min: 0,
    max: 10,
    step: 0.5,
  },
  {
    key: "organellesBonusSlots",
    label: "Organellen-Slots",
    hint: "Zusätzliche Slots beim Erhalt der Organellen.",
    min: 0,
    max: 100,
    step: 0.5,
  },
  {
    key: "ftlAttunementBonusSlots",
    label: "FTL-Attunement-Slots",
    hint: "Zusätzliche Slots beim Erhalt des FTL-Attunements.",
    min: 0,
    max: 100,
    step: 0.5,
  },
  {
    key: "apThreshold",
    label: "AP-Schwelle für weitere Steigerungen",
    hint: "Verdiente AP je weiterem Slot-Meilenstein.",
    min: 1,
    max: 1000,
    step: 1,
    integer: true,
  },
  {
    key: "apBonusSlots",
    label: "Slots je AP-Meilenstein",
    hint: "Zusätzliche Slots pro erreichter AP-Schwelle.",
    min: 0,
    max: 100,
    step: 0.5,
  },
];

export function parseTechnomageSpellSlotRules(
  value: unknown,
): TechnomageSpellSlotRules {
  const source =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rules = {} as TechnomageSpellSlotRules;

  for (const field of TECHNOMAGE_SPELL_SLOT_RULE_FIELDS) {
    const candidate = source[field.key];
    const valid =
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate >= field.min &&
      candidate <= field.max &&
      (!field.integer || Number.isInteger(candidate));
    rules[field.key] = valid
      ? (candidate as number)
      : DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES[field.key];
  }

  return rules;
}

export type TechnomageSpellSlotRulesValidation =
  | { ok: true; value: TechnomageSpellSlotRules }
  | { ok: false; error: string };

export function validateTechnomageSpellSlotRules(
  raw: Record<string, string>,
): TechnomageSpellSlotRulesValidation {
  const rules = {} as TechnomageSpellSlotRules;

  for (const field of TECHNOMAGE_SPELL_SLOT_RULE_FIELDS) {
    const value = raw[field.key]?.trim();
    const candidate = value === undefined || value === "" ? Number.NaN : Number(value);
    if (
      !Number.isFinite(candidate) ||
      candidate < field.min ||
      candidate > field.max ||
      (field.integer && !Number.isInteger(candidate))
    ) {
      return {
        ok: false,
        error:
          field.label +
          " muss " +
          (field.integer ? "eine ganze Zahl" : "eine Zahl") +
          " zwischen " +
          field.min +
          " und " +
          field.max +
          " sein.",
      };
    }
    rules[field.key] = candidate;
  }

  return { ok: true, value: rules };
}

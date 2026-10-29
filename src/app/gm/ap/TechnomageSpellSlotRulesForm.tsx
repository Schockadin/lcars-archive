"use client";

import { useActionState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES,
  TECHNOMAGE_SPELL_SLOT_RULE_FIELDS,
  type TechnomageSpellSlotRules,
} from "@/lib/technomageSpellSlotRules";
import {
  resetTechnomageSpellSlotRulesAction,
  saveTechnomageSpellSlotRulesAction,
  type RulesFormState,
} from "./actions";

const initialState: RulesFormState = {};

export default function TechnomageSpellSlotRulesForm({
  rules,
}: {
  rules: TechnomageSpellSlotRules;
}) {
  const [state, formAction, pending] = useActionState(
    saveTechnomageSpellSlotRulesAction,
    initialState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetTechnomageSpellSlotRulesAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="text-sm text-lcars-ink-dim">
        Erschaffung: aufgerundete Startslots + Erschaffungsbonus + (Verstand −
        Basiswert) × Modifikator. Bei Organellen, FTL-Attunement und jeder
        AP-Schwelle gilt der jeweilige Bonus mit dem Verstand-Wert des
        Meilensteins. Spätere Verstand-Steigerungen ändern bereits erreichte
        Meilensteine nicht.
      </p>
      <form action={formAction} className="flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[10px]">
          {TECHNOMAGE_SPELL_SLOT_RULE_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex flex-wrap items-baseline gap-[8px]"
            >
              <span className="min-w-[220px] flex-1">
                {field.label}
                <span className="block text-[12px] text-lcars-ink-dim">
                  {field.hint}
                </span>
              </span>
              <input
                name={field.key}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                defaultValue={rules[field.key]}
                className="lcars-input w-[110px] rounded-full text-right"
              />
              <span className="w-[120px] text-[12px] text-lcars-ink-dim">
                Standard: {DEFAULT_TECHNOMAGE_SPELL_SLOT_RULES[field.key]}
              </span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Slotregeln speichern
        </button>
      </form>
      <FormError message={state.error ?? resetState.error} />
      {(state.success ?? resetState.success) && (
        <FormSuccess>{state.success ?? resetState.success}</FormSuccess>
      )}
      <form action={resetAction}>
        <button
          type="submit"
          disabled={resetPending}
          onClick={confirmSubmit(
            "Technomage-Slotregeln auf die Standardwerte zurücksetzen?",
          )}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Slotregeln auf Standardwerte zurücksetzen
        </button>
      </form>
    </div>
  );
}

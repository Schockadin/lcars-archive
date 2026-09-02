"use client";
import { useActionState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  ADVANCEMENT_RULE_FIELDS,
  DEFAULT_ADVANCEMENT_RULES,
  type AdvancementRules,
} from "@/lib/advancement";
import { saveRulesAction, resetRulesAction, type RulesFormState } from "./actions";

const initialState: RulesFormState = {};

// Regel-Editor der Spielleitung. Die Felder kommen aus
// ADVANCEMENT_RULE_FIELDS — eine neue Regel taucht damit automatisch hier auf,
// ohne dass dieses Formular angefasst werden muss.
export default function AdvancementRulesForm({
  rules,
}: {
  rules: AdvancementRules;
}) {
  const [state, formAction, pending] = useActionState(
    saveRulesAction,
    initialState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetRulesAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <form action={formAction} className="flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[10px]">
          {ADVANCEMENT_RULE_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex flex-wrap items-baseline gap-[8px]"
            >
              <span className="flex-1 min-w-[220px]">
                {field.label}
                <span className="block text-lcars-ink-dim text-[12px]">
                  {field.hint}
                </span>
              </span>
              <input
                name={field.key}
                type="number"
                min={field.min}
                max={field.max}
                defaultValue={rules[field.key]}
                className="lcars-input rounded-full w-[100px] text-right"
              />
              <span className="text-lcars-ink-dim text-[12px] w-[110px]">
                Standard: {DEFAULT_ADVANCEMENT_RULES[field.key]}
              </span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Regelwerk speichern
        </button>
      </form>

      <form action={resetAction}>
        <button
          type="submit"
          disabled={resetPending}
          onClick={confirmSubmit(
            "Regelwerk auf die Standardwerte zurücksetzen? Bereits gebuchte AP bleiben unberührt.",
          )}
          className="lcars-pill-btn--outline disabled:opacity-50"
        >
          Auf Standardwerte zurücksetzen
        </button>
      </form>

      <FormError message={state.error ?? resetState.error} />
      {(state.success ?? resetState.success) && (
        <FormSuccess>{state.success ?? resetState.success}</FormSuccess>
      )}
    </div>
  );
}

"use client";
import { useActionState } from "react";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import type { CampaignRuleModule } from "@/lib/ruleModuleTypes";
import {
  saveCampaignRuleModuleAction,
  type RuleModuleActionState,
} from "./ruleModuleActions";

const initialState: RuleModuleActionState = {};

export default function RuleModuleForm({ module }: { module: CampaignRuleModule }) {
  const [state, action, pending] = useActionState(saveCampaignRuleModuleAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="moduleId" value={module.definition.id} />
      <p className="text-sm text-lcars-ink-dim">
        Die JSON-Definition enthält die Regeln, Ressourcen, Statuswerte, Talente und
        Prestige-Pfade dieses Moduls{module.definition.id === "technomage" ? ", Schulen und den vollständigen Spell-Katalog" : ""}.
        Änderungen werden auf passenden Charakterakten verwendet. Vor dem Speichern wird die Struktur geprüft.
      </p>
      <label className="flex items-center gap-[8px] font-bold">
        <input type="checkbox" name="enabled" value="true" defaultChecked={module.enabled} />
        Modul für die Kampagne aktivieren
      </label>
      <label htmlFor={`rule-module-definition-${module.definition.id}`} className="font-bold">
        {module.definition.name} · bearbeitbare Moduldefinition (JSON)
      </label>
      <textarea
        id={`rule-module-definition-${module.definition.id}`}
        name="definition"
        defaultValue={JSON.stringify(module.definition, null, 2)}
        rows={28}
        spellCheck={false}
        className="lcars-input min-h-[480px] w-full font-mono text-xs"
        required
      />
      <FormError message={state.error} />
      {state.success && <FormSuccess>Regelmodul gespeichert.</FormSuccess>}
      <SubmitButton pending={pending} pendingLabel="Speichert…" className="lcars-pill-btn--outline self-start">
        Regelmodul speichern
      </SubmitButton>
    </form>
  );
}

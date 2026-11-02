"use client";
import { useActionState } from "react";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import type { CampaignRuleModule } from "@/lib/ruleModuleTypes";
import { BASE_RULE_MODULE_ID } from "@/lib/baseRuleModule";
import {
  deleteCampaignRuleModuleAction,
  resetBaseCampaignRuleModuleAction,
  saveCampaignRuleModuleAction,
  type RuleModuleActionState,
} from "./ruleModuleActions";

const initialState: RuleModuleActionState = {};

export default function RuleModuleForm({ module }: { module: CampaignRuleModule }) {
  const [state, action, pending] = useActionState(saveCampaignRuleModuleAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetBaseCampaignRuleModuleAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCampaignRuleModuleAction, initialState);
  const isBaseModule = module.definition.id === BASE_RULE_MODULE_ID;
  return (
    <section className="flex flex-col gap-[12px] rounded-[10px] border border-current/20 p-[12px]">
      <form action={action} className="flex flex-col gap-[12px]">
        <input type="hidden" name="moduleId" value={module.definition.id} />
        <p className="text-sm text-lcars-ink-dim">
          Die JSON-Definition enthält die Regeln, Ressourcen, Statuswerte, Talente und
          Prestige-Pfade dieses Moduls{module.definition.id === "technomage" ? ", Schulen und den vollständigen Spell-Katalog" : ""}.
          Änderungen werden auf passenden Charakterakten verwendet. Vor dem Speichern wird die Struktur geprüft.
        </p>
        {isBaseModule ? (
          <p className="rounded border border-current/20 p-[8px] text-sm font-bold">
            Das STA-2e-Basismodul ist immer aktiv und kann nicht gelöscht werden.
          </p>
        ) : (
          <label className="flex items-center gap-[8px] font-bold">
            <input type="checkbox" name="enabled" value="true" defaultChecked={module.enabled} />
            Modul für die Kampagne aktivieren
          </label>
        )}
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

      {isBaseModule ? (
        <form action={resetAction} className="flex flex-col items-start gap-[8px] border-t border-current/15 pt-[12px]">
          <p className="text-xs text-lcars-ink-dim">
            Stellt die mitgelieferte STA-2e-Standarddefinition wieder her. Eigene Änderungen an diesem Modul gehen dabei verloren.
          </p>
          <FormError message={resetState.error} />
          {resetState.success && <FormSuccess>STA-2e-Standarddefinition wiederhergestellt.</FormSuccess>}
          <SubmitButton pending={resetPending} pendingLabel="Setzt zurück…" className="lcars-pill-btn--outline">
            Auf Standard zurücksetzen
          </SubmitButton>
        </form>
      ) : (
        <form
          action={deleteAction}
          className="flex flex-col items-start gap-[8px] border-t border-current/15 pt-[12px]"
          onSubmit={(event) => {
            if (!window.confirm(`Regelmodul „${module.definition.name}“ löschen? Gespeicherte Modulwerte auf Charakteren bleiben erhalten.`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="moduleId" value={module.definition.id} />
          <p className="text-xs text-lcars-ink-dim">
            Gespeicherte Modulwerte auf Charakteren bleiben erhalten und werden wieder sichtbar, falls ein Modul mit derselben ID erneut angelegt wird.
          </p>
          <FormError message={deleteState.error} />
          {deleteState.success && <FormSuccess>Regelmodul gelöscht.</FormSuccess>}
          <SubmitButton pending={deletePending} pendingLabel="Löscht…" className="lcars-pill-btn--outline">
            Regelmodul löschen
          </SubmitButton>
        </form>
      )}
    </section>
  );
}

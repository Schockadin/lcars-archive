"use client";
import { useActionState, useState } from "react";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import type { CampaignRuleModule } from "@/lib/ruleModuleTypes";
import { BASE_RULE_MODULE_ID } from "@/lib/baseRuleModule";
import RuleModuleBuilder from "./RuleModuleBuilder";
import {
  deleteCampaignRuleModuleAction,
  resetBaseCampaignRuleModuleAction,
  saveCampaignRuleModuleAction,
  type RuleModuleActionState,
} from "./ruleModuleActions";

const initialState: RuleModuleActionState = {};

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(stableSerialize).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableSerialize(record[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

function RuleModuleDefinitionFields({
  definition,
  state,
  onDraftChange,
}: {
  definition: CampaignRuleModule["definition"];
  state: RuleModuleActionState;
  onDraftChange: () => void;
}) {
  const [draft, setDraft] = useState(definition);

  return (
    <>
      <input type="hidden" name="definition" value={JSON.stringify(draft)} />
      <RuleModuleBuilder
        definition={draft}
        onChange={(nextDefinition) => {
          setDraft(nextDefinition);
          onDraftChange();
        }}
      />
      <FormError message={state.error} />
    </>
  );
}

export default function RuleModuleForm({ module }: { module: CampaignRuleModule }) {
  const [state, action, pending] = useActionState(saveCampaignRuleModuleAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetBaseCampaignRuleModuleAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCampaignRuleModuleAction, initialState);
  const [submittedDefinition, setSubmittedDefinition] = useState<string | null>(null);
  const isBaseModule = module.definition.id === BASE_RULE_MODULE_ID;

  return (
    <section className="flex flex-col gap-[12px] rounded-[10px] border border-current/20 p-[12px]">
      <form
        action={action}
        className="flex flex-col gap-[12px]"
        onSubmit={(event) => {
          const rawDefinition = new FormData(event.currentTarget).get("definition");
          if (typeof rawDefinition !== "string") return;
          try {
            setSubmittedDefinition(stableSerialize(JSON.parse(rawDefinition) as unknown));
          } catch {
            setSubmittedDefinition(null);
          }
        }}
      >
        <input type="hidden" name="moduleId" value={module.definition.id} />
        <p className="text-sm text-lcars-ink-dim">
          Stelle die Modulregeln aus den Bausteinen zusammen. Änderungen werden
          auf passenden Charakterakten verwendet und vor dem Speichern geprüft.
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
        <RuleModuleDefinitionFields
          key={module.updatedAt ?? module.definition.id}
          definition={module.definition}
          state={state}
          onDraftChange={() => setSubmittedDefinition(null)}
        />
        {state.success &&
          submittedDefinition === stableSerialize(module.definition) && (
            <FormSuccess>Regelmodul gespeichert.</FormSuccess>
          )}
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

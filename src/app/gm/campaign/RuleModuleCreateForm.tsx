"use client";
import { useActionState } from "react";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import {
  createCampaignRuleModuleAction,
  type RuleModuleActionState,
} from "./ruleModuleActions";

const initialState: RuleModuleActionState = {};

export default function RuleModuleCreateForm() {
  const [state, action, pending] = useActionState(createCampaignRuleModuleAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-[10px] rounded-[10px] border border-current/20 p-[12px]">
      <h3 className="font-bold">Weiteres Regelmodul anlegen</h3>
      <p className="text-xs text-lcars-ink-dim">
        Ein neues Modul kann eigene Regeln, Ressourcen, Status, Talente und Prestige-Pfade für bestimmte Rollen bereitstellen.
        Es startet deaktiviert und lässt sich anschließend als JSON bearbeiten.
      </p>
      <label className="flex flex-col gap-[4px] text-sm">
        Modulname
        <input className="lcars-input w-full" name="name" maxLength={200} required />
      </label>
      <label className="flex flex-col gap-[4px] text-sm">
        Kurzbeschreibung
        <input className="lcars-input w-full" name="summary" maxLength={2000} />
      </label>
      <label className="flex flex-col gap-[4px] text-sm">
        Charakterrollen, kommasepariert (* für alle)
        <input className="lcars-input w-full" name="characterRoles" defaultValue="*" maxLength={1000} required />
      </label>
      <FormError message={state.error} />
      {state.success && <FormSuccess>Regelmodul angelegt. Die Seite aktualisiert sich.</FormSuccess>}
      <SubmitButton pending={pending} pendingLabel="Legt an…" className="lcars-pill-btn--outline self-start">
        Regelmodul anlegen
      </SubmitButton>
    </form>
  );
}

"use client";
import { useActionState, useState } from "react";
import {
  SubmitButton,
  FormError,
  FormSuccess,
} from "@/app/_shared/FormPrimitives";
import CharacterValuesEditor from "../_shared/CharacterValuesEditor";
import {
  saveCharacterStatsAction,
  type CharacterPanelState,
} from "../_shared/panelActions";
import {
  advanceCharacterAction,
  lockCreationAction,
  type AdvancementActionResult,
} from "../_shared/advancementAction";
import { hasCompleteCreationValues } from "@/lib/characterStats";
import { creationBudget, creationCarryOver } from "@/lib/advancement";
import type { CharacterStats } from "@/types/characterStats";
import type { AdvancementRules } from "@/lib/advancement";
import type { ApAccount } from "@/lib/apReasons";
import type { Talent } from "@/lib/talentCatalog";
import type { Focus } from "@/lib/focusCatalog";

const initialState: CharacterPanelState = {};
const initialAdvancementState: AdvancementActionResult = {};

// Werte und AP-Aktionen in einem durchgehenden Bogen: Steigerungen sitzen
// direkt an Attributen, Disziplinen, Talenten und Schwerpunkten. Nur das
// Festschreiben der Ersterschaffung bleibt als eigenes Geschwister-Formular,
// weil verschachtelte <form>-Elemente ungültig wären.
export default function CharacterValuesPanel({
  userId,
  characterId,
  species,
  savedStats,
  account,
  rules,
  talents,
  focuses,
}: {
  userId: number;
  characterId: number;
  species: string | null;
  savedStats: CharacterStats;
  account: ApAccount;
  rules: AdvancementRules;
  talents: Talent[];
  focuses: Focus[];
}) {
  const [stats, setStats] = useState<CharacterStats>(savedStats);
  const [saveState, saveAction, savePending] = useActionState(
    saveCharacterStatsAction,
    initialState,
  );
  const [advancementState, advancementAction, advancementPending] =
    useActionState(advanceCharacterAction, initialAdvancementState);
  const [lockState, lockAction, lockPending] = useActionState(
    lockCreationAction,
    initialAdvancementState,
  );

  // Liefert der Server neue Werte (nach dem Speichern, einer Steigerung oder
  // dem Festschreiben der Erschaffung), zieht der lokale Stand nach.
  // Anpassung während des Renders, siehe React-Doku „Adjusting state when a
  // prop changes" — ein setState im Effekt löste einen zusätzlichen Render aus.
  const snapshot = JSON.stringify(savedStats);
  const [seenSnapshot, setSeenSnapshot] = useState(snapshot);
  if (snapshot !== seenSnapshot) {
    setSeenSnapshot(snapshot);
    setStats(savedStats);
  }

  const budget = creationBudget(stats, rules);
  const carryOver = creationCarryOver(stats, rules);
  const savedComplete = hasCompleteCreationValues(savedStats);

  return (
    <div className="flex flex-col gap-[12px]">
      <form action={saveAction} className="flex flex-col gap-[12px]">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="characterId" value={characterId} />
        {/* Der komplette Wertesatz als ein JSON-Feld, siehe
            characterStatsPayload.ts. */}
        <input type="hidden" name="statsJson" value={JSON.stringify(stats)} />

        <p className="stat-ap-inline-balance">
          <strong>{account.available}</strong> AP verfügbar
          {!stats.creationLocked && rules.creationCarryOverMax > 0
            ? ` · nach der Erschaffung bis zu ${account.available + carryOver} AP`
            : ""}
        </p>

        <CharacterValuesEditor
          stats={stats}
          onChange={setStats}
          rules={rules}
          talents={talents}
          focuses={focuses}
          species={species}
          idPrefix="values-panel"
          showPersonnelFields={false}
          advancement={
            stats.creationLocked
              ? {
                  characterId,
                  availableAp: account.available,
                  pending: advancementPending,
                  submit: advancementAction,
                }
              : undefined
          }
        />

        <SubmitButton
          pending={savePending}
          pendingLabel="Wird gespeichert…"
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Werte speichern
        </SubmitButton>

        <FormError message={saveState?.error} />
        {saveState?.success && (
          <p className="text-lcars-senary-ink" role="status">
            {saveState.success}
          </p>
        )}
      </form>

      {!stats.creationLocked && (
        <div className="stat-creation-controls">
          <p className="stat-sheet-rule">
            Erschaffungsbudget: {budget.attributeCost} /{" "}
            {rules.creationAttributeBudget} AP für Attribute und{" "}
            {budget.departmentCost} / {rules.creationDepartmentBudget} AP für
            Disziplinen.
          </p>
          {stats.pendingAdvancements.length > 0 && (
            <p className="stat-sheet-rule">
              Beim erneuten Abschließen werden{" "}
              {stats.pendingAdvancements.length} zurückgenommene Steigerung
              {stats.pendingAdvancements.length === 1 ? "" : "en"} wieder
              angewandt, soweit Regeln und AP es zulassen.
            </p>
          )}
          {!savedComplete && (
            <p className="stat-sheet-rule">
              Speichere zuerst alle Attribute und Disziplinen.
            </p>
          )}
          <form action={lockAction}>
            <input type="hidden" name="characterId" value={characterId} />
            <button
              type="submit"
              disabled={lockPending || budget.overBudget || !savedComplete}
              className="lcars-pill-btn--outline disabled:opacity-50"
              onClick={(event) => {
                if (
                  !window.confirm(
                    "Erschaffung abschließen? Danach wachsen Attribute, Disziplinen, Talente und Schwerpunkte nur noch über AP.",
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              {lockPending ? "Schreibt fest …" : "Erschaffung abschließen"}
            </button>
          </form>
        </div>
      )}

      <FormError message={advancementState?.error ?? lockState?.error} />
      {(advancementState?.success ?? lockState?.success) && (
        <FormSuccess>
          {advancementState?.success ?? lockState?.success}
        </FormSuccess>
      )}
    </div>
  );
}

"use client";
import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
} from "@/lib/characterStats";
import {
  checkAdvancement,
  creationBudget,
  creationCarryOver,
  type AdvancementRules,
} from "@/lib/advancement";
import {
  advanceCharacterAction,
  lockCreationAction,
  type AdvancementActionResult,
} from "../../_shared/advancementAction";
import { AP_REASON_LABELS, type ApAccount } from "@/lib/apReasons";
import type { CharacterStats } from "@/types/characterStats";
import type { Talent } from "@/lib/talentCatalog";
import TalentPicker from "../../_shared/TalentPicker";

const initialState: AdvancementActionResult = {};

// AP-Bereich des Charakterbogens: Kontostand, Erschaffungsbudget (solange der
// Charakter nicht festgeschrieben ist), die Steigern-Knöpfe und das
// Buchungsjournal.
//
// Eigene Komponente neben dem Werte-Formular, weil sie eigene Server-Actions
// nutzt: ein verschachteltes <form> ist in HTML nicht erlaubt, und Steigern
// soll ohnehin sofort buchen statt auf „Werte speichern" zu warten.
export default function AdvancementPanel({
  characterId,
  stats,
  account,
  rules,
  talents,
  species,
}: {
  characterId: number;
  stats: CharacterStats;
  account: ApAccount;
  // Das geltende AP-Regelwerk (Kosten, Erschaffungsbudgets) — von der
  // Spielleitung unter /gm/ap einstellbar, deshalb als Prop statt als Konstante.
  rules: AdvancementRules;
  // Katalog für die Talent-Auswahlliste (gepflegt unter /gm/talents).
  talents: Talent[];
  // Spezies der Akte — für Voraussetzungen wie „Vulcan".
  species: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    advanceCharacterAction,
    initialState,
  );
  const [lockState, lockAction, lockPending] = useActionState(
    lockCreationAction,
    initialState,
  );
  const [focus, setFocus] = useState("");

  const budget = creationBudget(stats, rules);
  const locked = stats.creationLocked;
  // Was beim Festschreiben aufs Konto wandert — rechnet live mit, während unten
  // die Werte getippt werden (der State dafür liegt in CharacterSheet.tsx).
  const carryOver = creationCarryOver(stats, rules);

  // Eine Zeile je steigerbarem Wert: Kosten des nächsten Schritts, oder der
  // Grund, warum es (noch) nicht geht — dieselbe Prüfung wie auf dem Server.
  function stepInfo(kind: "attribute" | "department", key: string) {
    return checkAdvancement(stats, { kind, key }, account.available, rules);
  }

  return (
    <section className="stat-sheet-section">
      <h2 className="stat-sheet-section-title">
        Advancement <span className="stat-label-secondary">Erfahrungspunkte</span>
      </h2>

      {/* ── Kontostand ─────────────────────────────────────────────── */}
      <div className="stat-ap-account">
        <div className="stat-ap-balance">
          <span className="stat-ap-value">{account.available}</span>
          <span className="stat-label-secondary">AP verfügbar</span>
        </div>
        {!locked && (
          <div className="stat-ap-balance">
            <span className="stat-ap-value">{account.available + carryOver}</span>
            <span className="stat-label-secondary">
              nach der Erschaffung
            </span>
          </div>
        )}
        <p className="stat-sheet-rule">
          {account.earned} AP vergeben · {account.spent} AP ausgegeben
        </p>
      </div>

      {/* ── Ersterschaffung ────────────────────────────────────────── */}
      {!locked && (
        <div className="stat-ap-block">
          <h3 className="stat-ap-heading">
            Character Creation{" "}
            <span className="stat-label-secondary">Ersterschaffung</span>
          </h3>
          <p className="stat-sheet-rule">
            {rules.creationAttributeBudget} AP für Attribute,{" "}
            {rules.creationDepartmentBudget} AP für Disziplinen, dazu{" "}
            {rules.creationFreeValues} Werte, {rules.creationFreeTalents} Talente
            und {rules.creationFreeFocuses} Schwerpunkte frei. Attribute und
            Disziplinen trägst du oben direkt ein, solange die Erschaffung läuft.
          </p>
          <div className="stat-ap-budget">
            <div>
              <span className="stat-label-primary">Attributes</span>
              <span className="stat-label-secondary">
                {budget.attributeCost} / {rules.creationAttributeBudget} AP
                {budget.attributeRemaining >= 0
                  ? ` · ${budget.attributeRemaining} übrig`
                  : ` · ${-budget.attributeRemaining} zu viel`}
              </span>
            </div>
            <div>
              <span className="stat-label-primary">Departments</span>
              <span className="stat-label-secondary">
                {budget.departmentCost} / {rules.creationDepartmentBudget} AP
                {budget.departmentRemaining >= 0
                  ? ` · ${budget.departmentRemaining} übrig`
                  : ` · ${-budget.departmentRemaining} zu viel`}
              </span>
            </div>
          </div>
          {budget.overBudget && (
            <p className="stat-ap-warning">
              Das Erschaffungsbudget ist überzogen — bitte Werte anpassen.
            </p>
          )}
          {!budget.overBudget && rules.creationCarryOverMax > 0 && (
            <p className="stat-sheet-rule">
              Nicht verbrauchtes Budget wird beim Festschreiben gutgeschrieben —
              höchstens {rules.creationCarryOverMax} AP. Aktuell wären das{" "}
              <strong>{carryOver} AP</strong>.
            </p>
          )}

          <form action={lockAction}>
            <input type="hidden" name="characterId" value={characterId} />
            <button
              type="submit"
              disabled={lockPending || budget.overBudget}
              className="lcars-pill-btn--outline disabled:opacity-50"
              onClick={(e) => {
                if (
                  !window.confirm(
                    "Erschaffung abschließen? Danach lassen sich Attribute, Disziplinen, Talente und Schwerpunkte nur noch mit AP steigern.",
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              {lockPending ? "Schreibt fest …" : "Erschaffung abschließen"}
            </button>
          </form>
        </div>
      )}

      {/* ── Steigern ───────────────────────────────────────────────── */}
      {locked && (
        <div className="stat-ap-block">
          <h3 className="stat-ap-heading">
            Advancement <span className="stat-label-secondary">Steigern</span>
          </h3>

          <div className="stat-ap-steps">
            {[
              { title: "Attributes", kind: "attribute" as const, fields: ATTRIBUTE_FIELDS },
              { title: "Departments", kind: "department" as const, fields: DEPARTMENT_FIELDS },
            ].map((group) => (
              <div key={group.kind}>
                <span className="stat-label-primary">{group.title}</span>
                <ul className="stat-ap-step-list">
                  {group.fields.map((field) => {
                    const info = stepInfo(group.kind, field.key);
                    return (
                      <li key={field.key} className="stat-ap-step">
                        <span className="stat-ap-step-label">
                          {field.original ?? field.label}
                        </span>
                        <form action={formAction}>
                          <input type="hidden" name="characterId" value={characterId} />
                          <input type="hidden" name="kind" value={group.kind} />
                          <input type="hidden" name="key" value={field.key} />
                          <button
                            type="submit"
                            disabled={pending || !info.ok}
                            title={
                              info.ok
                                ? `Danach bleiben ${account.available - info.plan.cost} AP`
                                : info.error
                            }
                            className="lcars-pill-btn--outline disabled:opacity-50"
                          >
                            {info.ok ? `+1 · ${info.plan.cost} AP` : "+1"}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="stat-ap-adds">
            {/* Talente kommen ausschließlich aus dem Katalog — kein Freitext
                mehr. Das Fenster bucht direkt: ein Klick auf „Übernehmen"
                ruft die Action mit dem gewählten Eintrag auf, ein zweiter
                Knopf daneben entfällt. Deshalb hier auch kein <form>, sondern
                der programmatische Aufruf der Action (React 19). */}
            <div className="stat-ap-add">
              <span className="stat-field-label">
                <span className="stat-label-primary">Talent</span>
                <span className="stat-label-secondary">
                  {rules.talentCost} AP
                  {account.available >= rules.talentCost
                    ? ` · danach ${account.available - rules.talentCost} AP`
                    : " · nicht genug AP"}
                </span>
              </span>
              <TalentPicker
                talents={talents}
                stats={stats}
                species={species}
                taken={stats.talents}
                cost={rules.talentCost}
                availableAp={account.available}
                disabled={pending || talents.length === 0}
                buttonLabel="Talent wählen …"
                onPick={(entry) => {
                  const payload = new FormData();
                  payload.set("characterId", String(characterId));
                  payload.set("kind", "talent");
                  payload.set("entry", entry);
                  formAction(payload);
                }}
              />
              {talents.length === 0 && (
                <span className="stat-label-secondary">
                  Der Talent-Katalog ist leer — die Spielleitung pflegt ihn
                  unter &bdquo;Talente&ldquo;.
                </span>
              )}
            </div>

            <form action={formAction} className="stat-ap-add">
              <input type="hidden" name="characterId" value={characterId} />
              <input type="hidden" name="kind" value="focus" />
              <label className="stat-field-label" htmlFor="advance-focus">
                <span className="stat-label-primary">Focus</span>
                <span className="stat-label-secondary">
                  {rules.focusCost} AP
                  {account.available >= rules.focusCost
                    ? ` · danach ${account.available - rules.focusCost} AP`
                    : " · nicht genug AP"}
                </span>
              </label>
              <input
                id="advance-focus"
                name="entry"
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="stat-field-input"
              />
              <button
                type="submit"
                disabled={pending || focus.trim() === "" || account.available < rules.focusCost}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Hinzufügen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Buchungsjournal ────────────────────────────────────────── */}
      <div className="stat-ap-block">
        <h3 className="stat-ap-heading">
          Ledger <span className="stat-label-secondary">Buchungen</span>
        </h3>
        {account.entries.length === 0 ? (
          <p className="lcars-empty-state">Noch keine AP gebucht.</p>
        ) : (
          <ul className="stat-ap-ledger">
            {account.entries.map((entry) => (
              <li key={entry.id} className="stat-ap-ledger-row">
                <span
                  className={
                    entry.amount >= 0
                      ? "stat-ap-amount stat-ap-amount--plus"
                      : "stat-ap-amount"
                  }
                >
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </span>
                <span className="stat-ap-ledger-text">
                  {AP_REASON_LABELS[entry.reason]}
                  {entry.note ? ` — ${entry.note}` : ""}
                </span>
                <span className="stat-ap-ledger-meta">
                  {entry.createdAt.slice(0, 10)}
                  {entry.createdByName ? ` · ${entry.createdByName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormError message={state?.error ?? lockState?.error} />
      {(state?.success ?? lockState?.success) && (
        <FormSuccess>{state?.success ?? lockState?.success}</FormSuccess>
      )}
    </section>
  );
}

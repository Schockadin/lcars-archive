"use client";
import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import {
  RULE_BODY_MAX,
  RULE_NAME_MAX,
  type CampaignRule,
} from "@/lib/campaignRuleTypes";
import {
  createRuleAction,
  updateRuleAction,
  deleteRuleAction,
  type RuleFormState,
} from "./actions";

const initialState: RuleFormState = {};

// Gemeinsame Felder von Anlegen und Bearbeiten — sonst wären beide Formulare
// bis auf die Action wortgleich (wie in FocusEditor/TalentEditor).
function RuleFields({ idPrefix, rule }: { idPrefix: string; rule?: CampaignRule }) {
  return (
    <>
      <div className="flex flex-wrap gap-[8px]">
        <label className="flex flex-col gap-[4px] flex-1 min-w-[200px]">
          <span className="lcars-eyebrow">Name der Regel</span>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            required
            maxLength={RULE_NAME_MAX}
            placeholder="z.B. Kritische Erfolge"
            defaultValue={rule?.name ?? ""}
            className="lcars-input rounded-full w-full"
          />
        </label>
        <label className="flex flex-col gap-[4px] w-[120px]">
          <span className="lcars-eyebrow">Reihenfolge</span>
          <input
            id={`${idPrefix}-order`}
            name="sortOrder"
            type="number"
            step={1}
            defaultValue={rule?.sortOrder ?? 0}
            className="lcars-input rounded-full w-full"
          />
        </label>
      </div>
      <div className="flex flex-col gap-[4px]">
        <label htmlFor={`${idPrefix}-body`} className="lcars-eyebrow">
          Regeltext
        </label>
        {/* Markdown wie in den übrigen Textfeldern des Projekts — auf dem
            Spickzettel wird der Text gerendert (Bildschirm) bzw. über
            toPdfBlocks in Absätze zerlegt (PDF). */}
        <MarkdownEditor
          id={`${idPrefix}-body`}
          name="body"
          required
          rows={10}
          defaultValue={rule?.body ?? ""}
        />
        <p className="text-lcars-ink-dim text-[12px]">
          Markdown erlaubt · höchstens {RULE_BODY_MAX} Zeichen
        </p>
      </div>
    </>
  );
}

function NewRuleForm() {
  const [state, formAction, pending] = useActionState(
    createRuleAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-[8px]">
      <button
        type="button"
        className="lcars-pill-btn--outline self-start"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Abbrechen" : "Neue Regel"}
      </button>

      {open && (
        // key auf dem Erfolgstext: nach dem Anlegen sollen die Felder wieder
        // leer sein — ein neuer key wirft das Formular samt defaultValues neu.
        <form
          key={state.success ?? "new"}
          action={formAction}
          className="flex flex-col gap-[8px]"
        >
          <RuleFields idPrefix="new-rule" />
          <button
            type="submit"
            disabled={pending}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
      )}

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </div>
  );
}

function RuleRow({ rule }: { rule: CampaignRule }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateRuleAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRuleAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-[var(--lcars-ink-dim)]/30 pb-[8px]">
      <button
        type="button"
        className="flex flex-wrap items-baseline gap-[8px] text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
          {rule.sortOrder}
        </span>
        <span className="flex-1 min-w-[180px]">{rule.name}</span>
      </button>

      {!open && (
        <div
          className="text-lcars-ink mission-body line-clamp-2 text-[13px]"
          dangerouslySetInnerHTML={{ __html: rule.bodyHtml }}
        />
      )}

      {open && (
        <>
          <form action={formAction} className="flex flex-col gap-[8px]">
            <input type="hidden" name="id" value={rule.id} />
            <RuleFields idPrefix={`rule-${rule.id}`} rule={rule} />
            <div className="flex flex-wrap gap-[8px]">
              <button
                type="submit"
                disabled={pending}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>

          {/* Jede Regel ist löschbar — sie steht auf keinem Bogen als
              Eintrag, sondern erscheint auf allen Spickzetteln gleich. */}
          <form action={deleteAction}>
            <input type="hidden" name="id" value={rule.id} />
            <button
              type="submit"
              disabled={deletePending}
              onClick={confirmSubmit(
                `„${rule.name}“ wirklich löschen? Die Regel verschwindet damit von allen Spickzetteln.`,
              )}
              className="lcars-pill-btn--outline disabled:opacity-50"
            >
              Löschen
            </button>
          </form>
        </>
      )}

      <FormError message={state.error ?? deleteState.error} />
      {(state.success ?? deleteState.success) && (
        <FormSuccess>{state.success ?? deleteState.success}</FormSuccess>
      )}
    </div>
  );
}

// Regel-Verwaltung der Spielleitung. Kein Suchfeld und kein Filter: anders als
// bei den 155 Talenten und 170 Schwerpunkten sind das eine Handvoll Einträge,
// die vollständig auf den Bogen sollen — eine Filterzeile darüber wäre nur
// Bedienlast ohne Nutzen.
export default function RuleEditor({ rules }: { rules: CampaignRule[] }) {
  return (
    <div className="flex flex-col gap-[16px]">
      <NewRuleForm />

      {rules.length === 0 ? (
        <p className="lcars-empty-state">
          Noch keine eigenen Regeln — der Spickzettel zeigt dann nur die Regeln
          aus dem Regelwerk.
        </p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}

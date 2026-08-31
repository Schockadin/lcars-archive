"use client";
import { useActionState } from "react";
import { FormField, SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  SCALAR_NUMBER_FIELDS,
  TEXT_FIELDS,
  LIST_FIELDS,
  EXPERIENCE_OPTIONS,
} from "@/lib/characterStats";
import {
  characterStatsAction,
  type CharacterStatsFormState,
} from "../../_shared/statsAction";
import type { CharacterStats } from "@/types/characterStats";

const inputClass = "rounded-lcars-pill lcars-input w-full";
const initialState: CharacterStatsFormState = {};

// Charakterwerte-Formular (Aufbau nach dem offiziellen Bogen: Personalakte,
// Attribute, Disziplinen, abgeleitete Werte, Listenfelder). Bewusst KEIN
// ContentEditor: der ist auf Markdown-Text + Entwurf + Autolinking
// zugeschnitten, was hier alles nicht zutrifft — die Formularbausteine
// (FormField/SubmitButton/FormError) und die Action-Konventionen sind
// dieselben.
export default function CharacterStatsForm({
  userId,
  characterId,
  stats,
}: {
  userId: number;
  characterId: number;
  stats: CharacterStats;
}) {
  const [state, formAction, pending] = useActionState(
    characterStatsAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="characterId" value={characterId} />

      <section>
        <h2>Personalakte</h2>
        <div className="content-editor-head-grid">
          {TEXT_FIELDS.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              htmlFor={`stats-${field.key}`}
            >
              <input
                id={`stats-${field.key}`}
                name={field.key}
                type="text"
                defaultValue={stats[field.key] ?? ""}
                className={inputClass}
              />
            </FormField>
          ))}

          <FormField label="Erfahrung (Experience)" htmlFor="stats-experience">
            <select
              id="stats-experience"
              name="experience"
              defaultValue={stats.experience ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section>
        <h2>Attribute</h2>
        <div className="content-editor-head-grid">
          {ATTRIBUTE_FIELDS.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              htmlFor={`stats-attributes-${field.key}`}
            >
              <input
                id={`stats-attributes-${field.key}`}
                name={`attributes.${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
                defaultValue={stats.attributes[field.key] ?? ""}
                className={inputClass}
              />
            </FormField>
          ))}
        </div>
      </section>

      <section>
        <h2>Disziplinen</h2>
        <div className="content-editor-head-grid">
          {DEPARTMENT_FIELDS.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              htmlFor={`stats-departments-${field.key}`}
            >
              <input
                id={`stats-departments-${field.key}`}
                name={`departments.${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
                defaultValue={stats.departments[field.key] ?? ""}
                className={inputClass}
              />
            </FormField>
          ))}
        </div>
      </section>

      <section>
        <h2>Werte im Spiel</h2>
        <div className="content-editor-head-grid">
          {SCALAR_NUMBER_FIELDS.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              htmlFor={`stats-${field.key}`}
            >
              <input
                id={`stats-${field.key}`}
                name={field.key}
                type="number"
                min={field.min}
                max={field.max}
                defaultValue={stats[field.key] ?? ""}
                className={inputClass}
              />
            </FormField>
          ))}
        </div>
      </section>

      <section>
        <h2>Listen</h2>
        {LIST_FIELDS.map((field) => (
          <FormField
            key={field.key}
            label={field.label}
            htmlFor={`stats-${field.key}`}
            hint="Ein Eintrag je Zeile."
          >
            <textarea
              id={`stats-${field.key}`}
              name={field.key}
              rows={4}
              defaultValue={stats[field.key].join("\n")}
              className="lcars-input w-full"
            />
          </FormField>
        ))}
      </section>

      <SubmitButton pending={pending} pendingLabel="Speichert …">
        Werte speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}

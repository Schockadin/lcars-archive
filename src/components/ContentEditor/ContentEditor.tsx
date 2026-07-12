"use client";
import { useActionState, type ReactNode } from "react";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import { FormField, SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import HeadFieldRenderer from "./HeadFieldRenderer";
import MetadataSection from "./MetadataSection";
import type { HeadField } from "./headFields";

interface ContentEditorState {
  error?: string;
}

interface ContentEditorProps {
  mode: "create" | "edit";
  action: (
    state: ContentEditorState,
    formData: FormData,
  ) => Promise<ContentEditorState>;
  initialState: ContentEditorState;
  // z.B. userId (immer) + entryId/characterId/... (nur im Edit-Modus).
  hiddenFields: Record<string, string | number>;
  headFields: HeadField[];
  // Quelle für die defaultValue jedes Head-Felds, per field.name aufgelöst.
  defaults?: Record<string, unknown>;
  idPrefix: string;
  bodyName?: string;
  bodyLabel: string;
  bodyHint?: ReactNode;
  bodyDefaultValue?: string;
  bodyRequired?: boolean;
  bodyLarge?: boolean;
  isAdminOrGM?: boolean;
  // z.B. Mission-Logs Autor-/Missions-Select (dynamische Optionen, nur create).
  extraHeadSlot?: ReactNode;
  // Statische Zusatzfelder in der aufklappbaren "Metadaten +/-"-Sektion
  // (Charakter/Mission/Mission-Log — keine Reaktivität auf andere Feldwerte
  // nötig). Für Archiv-Einträge (Metadaten-Felder hängen von der gewählten
  // Kategorie ab) stattdessen metadataSlot verwenden.
  metadataFields?: HeadField[];
  // Voll selbst gebauter Ersatz für metadataFields, inkl. eigenem
  // MetadataSection-Wrapper — für Fälle, die auf andere Feldwerte reagieren
  // müssen (z.B. Archiv-Kategorie).
  metadataSlot?: ReactNode;
  submitLabel: string;
  submitPendingLabel: string;
}

export default function ContentEditor({
  mode,
  action,
  initialState,
  hiddenFields,
  headFields,
  defaults = {},
  idPrefix,
  bodyName = "bodyMarkdown",
  bodyLabel,
  bodyHint,
  bodyDefaultValue,
  bodyRequired = false,
  bodyLarge = false,
  isAdminOrGM = false,
  extraHeadSlot,
  metadataFields,
  metadataSlot,
  submitLabel,
  submitPendingLabel,
}: ContentEditorProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const visibleFields = headFields.filter(
    (field) => !field.showIf || field.showIf({ mode }),
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="content-editor-head-grid">
        {extraHeadSlot}
        {visibleFields.map((field) => (
          <HeadFieldRenderer
            key={field.name}
            field={field}
            idPrefix={idPrefix}
            defaultValue={defaults[field.name]}
          />
        ))}
      </div>

      {metadataSlot}
      {!metadataSlot && metadataFields && metadataFields.length > 0 && (
        <MetadataSection>
          {metadataFields
            .filter((field) => !field.showIf || field.showIf({ mode }))
            .map((field) => (
              <HeadFieldRenderer
                key={field.name}
                field={field}
                idPrefix={idPrefix}
                defaultValue={defaults[field.name]}
              />
            ))}
        </MetadataSection>
      )}

      <FormField
        label={bodyLabel}
        htmlFor={`${idPrefix}-body`}
        hint={bodyHint}
      >
        <MarkdownEditor
          id={`${idPrefix}-body`}
          name={bodyName}
          required={bodyRequired}
          defaultValue={bodyDefaultValue}
          isAdminOrGM={isAdminOrGM}
          large={bodyLarge}
        />
      </FormField>

      <AutoLinkCheckbox idPrefix={idPrefix} />

      <SubmitButton pending={pending} pendingLabel={submitPendingLabel}>
        {submitLabel}
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}

"use client";
import { useActionState, type ReactNode } from "react";
import MarkdownEditor from "@/app/users/_shared/MarkdownEditor";
import AutoLinkCheckbox from "@/app/users/_shared/AutoLinkCheckbox";
import { FormField, SubmitButton, FormError } from "@/app/users/_shared/FormPrimitives";
import HeadFieldRenderer from "./HeadFieldRenderer";
import type { HeadField } from "./headFields";

export interface ContentEditorState {
  error?: string;
}

export interface ContentEditorProps {
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

      {extraHeadSlot}

      <div className="content-editor-head-grid">
        {visibleFields.map((field) => (
          <HeadFieldRenderer
            key={field.name}
            field={field}
            idPrefix={idPrefix}
            defaultValue={defaults[field.name]}
          />
        ))}
      </div>

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

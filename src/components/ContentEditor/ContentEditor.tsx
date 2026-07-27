"use client";
import { useActionState, useState, type ReactNode } from "react";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import { FormField, SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import HeadFieldRenderer from "./HeadFieldRenderer";
import MetadataSection from "./MetadataSection";
import type { HeadField } from "./headFields";
import type { ContentImageType } from "@/lib/contentImages";

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
  // Nur im Edit-Modus sinnvoll (contentId bekannt) — siehe MarkdownEditor.tsx.
  insertImage?: { contentType: ContentImageType; contentId: number };
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
  // Aktueller Entwurf-Status beim Bearbeiten (aus content.isDraft) — steuert
  // den Startwert der "Als Entwurf speichern"-Checkbox. Im Create-Modus
  // bewusst weggelassen (Default: unchecked, sofort veröffentlichen).
  draftDefaultValue?: boolean;
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
  insertImage,
  extraHeadSlot,
  metadataFields,
  metadataSlot,
  draftDefaultValue = false,
  submitLabel,
  submitPendingLabel,
}: ContentEditorProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  // Steuert sowohl die Checkbox als auch das required-Attribut des
  // Textfelds unten (siehe MarkdownEditor required={bodyRequired &&
  // !isDraft}) — ein Entwurf darf ohne Text gespeichert werden, das ist der
  // eigentliche Sinn eines Entwurfs. Titel & Co. bleiben bewusst immer
  // Pflicht (siehe headFields.ts) — die sind auch für einen Entwurf
  // trivial ausfüllbar und werden u.a. für die Slug-Bildung gebraucht.
  const [isDraft, setIsDraft] = useState(draftDefaultValue);

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

      <div className="flex items-center gap-[8px]">
        <input
          id={`${idPrefix}-is-draft`}
          name="isDraft"
          type="checkbox"
          checked={isDraft}
          onChange={(e) => setIsDraft(e.target.checked)}
          className="h-[16px] w-[16px]"
        />
        <label htmlFor={`${idPrefix}-is-draft`} className="lcars-text text-[14px]">
          Als Entwurf speichern (Text ist dann optional; sichtbar nur für dich,
          bis du den Entwurf veröffentlichst)
        </label>
      </div>

      <FormField
        label={bodyLabel}
        htmlFor={`${idPrefix}-body`}
        hint={bodyHint}
      >
        <MarkdownEditor
          id={`${idPrefix}-body`}
          name={bodyName}
          required={bodyRequired && !isDraft}
          defaultValue={bodyDefaultValue}
          isAdminOrGM={isAdminOrGM}
          large={bodyLarge}
          insertImage={insertImage}
        />
      </FormField>

      {/* Neue Inhalte: Autolinking standardmäßig aktiv (siehe AutoLinkCheckbox);
          beim Bearbeiten bleibt es aus. */}
      <AutoLinkCheckbox idPrefix={idPrefix} defaultChecked={mode === "create"} />

      <SubmitButton pending={pending} pendingLabel={submitPendingLabel}>
        {submitLabel}
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}

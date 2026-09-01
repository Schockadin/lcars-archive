"use client";
import { useActionState } from "react";
import {
  updateDialogueMetadataAction,
  type DialogueMetaFormState,
} from "./actions";
import { FormField, FormError, SubmitButton } from "@/app/_shared/FormPrimitives";
import type { DialogueMetadataForEdit } from "@/lib/dialogues";

const initialState: DialogueMetaFormState = {};
const inputClass = "rounded-lcars-pill lcars-input w-full";

// Admin-only Formular zum Bearbeiten der Gesprächs-Metadaten (Titel, Datum,
// Schauplatz, Ort, Tags) — der Gesprächsverlauf (Nachrichten) wird hier nicht
// angefasst.
export default function EditDialogueMetadataForm({
  dialogue,
  locations,
}: {
  dialogue: DialogueMetadataForEdit;
  locations: { slug: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    updateDialogueMetadataAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <input type="hidden" name="dialogueId" value={dialogue.id} />

      <FormField label="Titel" htmlFor="dlg-title">
        <input
          id="dlg-title"
          name="title"
          required
          defaultValue={dialogue.title}
          className={inputClass}
        />
      </FormField>

      <FormField label="Datum" htmlFor="dlg-date">
        <input
          id="dlg-date"
          name="logDate"
          type="date"
          defaultValue={dialogue.logDate ?? undefined}
          className={inputClass}
        />
      </FormField>

      <FormField label="Schauplatz (freier Text)" htmlFor="dlg-setting">
        <input
          id="dlg-setting"
          name="setting"
          defaultValue={dialogue.setting ?? undefined}
          className={inputClass}
        />
      </FormField>

      <FormField label="Ort (verknüpfter Archiv-Eintrag)" htmlFor="dlg-location">
        <select
          id="dlg-location"
          name="locationSlug"
          defaultValue={dialogue.locationSlug ?? ""}
          className={inputClass}
        >
          <option value="">— kein Ort —</option>
          {locations.map((loc) => (
            <option key={loc.slug} value={loc.slug}>
              {loc.title}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Tags (kommagetrennt)" htmlFor="dlg-tags">
        <input
          id="dlg-tags"
          name="tags"
          defaultValue={dialogue.tags.join(", ")}
          className={inputClass}
        />
      </FormField>

      <FormError message={state?.error} />

      <SubmitButton pending={pending} pendingLabel="Wird gespeichert…">
        Änderungen speichern
      </SubmitButton>
    </form>
  );
}

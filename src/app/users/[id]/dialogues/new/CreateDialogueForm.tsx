"use client";
import { useActionState } from "react";
import { createDialogueAction, type CreateDialogueState } from "./actions";
import type { CharacterWithOwner } from "@/lib/characters";
import {
  FormField,
  SubmitButton,
  FormError,
} from "../../../_shared/FormPrimitives";

const initialState: CreateDialogueState = {};

const inputClass = "rounded-lcars-pill lcars-input";
const textAreaClass =
  "rounded-lcars-pill lcars-input min-h-[500px] resize-y font-mono";

export default function CreateDialogueForm({
  userId,
  ownCharacters,
  partnerCharacters,
  locations,
  defaultLogDate,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  partnerCharacters: CharacterWithOwner[];
  locations: { slug: string; title: string }[];
  defaultLogDate: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createDialogueAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-[16px] w-full sm:max-w-[420px]"
    >
      <input type="hidden" name="userId" value={userId} />

      <FormField label="Dein Charakter" htmlFor="dlg-own-character">
        <select
          id="dlg-own-character"
          name="ownCharacterId"
          required
          className={inputClass}
        >
          {ownCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Gesprächspartner" htmlFor="dlg-partner-character">
        <select
          id="dlg-partner-character"
          name="partnerCharacterId"
          required
          className={inputClass}
        >
          {partnerCharacters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (gespielt von {c.playerName})
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Titel" htmlFor="dlg-title">
        <input
          id="dlg-title"
          name="title"
          type="text"
          required
          className={inputClass}
        />
      </FormField>

      <FormField label="Schauplatz" htmlFor="dlg-setting">
        <input
          id="dlg-setting"
          name="setting"
          type="text"
          className={inputClass}
        />
      </FormField>

      <FormField label="Ort" htmlFor="dlg-location">
        <select
          id="dlg-location"
          name="locationSlug"
          defaultValue=""
          className={inputClass}
        >
          <option value="">Kein Ort</option>
          {locations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.title}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Datum" htmlFor="dlg-date">
        <input
          id="dlg-date"
          name="logDate"
          type="date"
          defaultValue={defaultLogDate ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Tags (kommagetrennt)" htmlFor="dlg-tags">
        <input id="dlg-tags" name="tags" type="text" className={inputClass} />
      </FormField>

      <FormField
        label="Erste Nachricht"
        htmlFor="dlg-body"
        hint="Unterstützt Markdown-Formatierung."
      >
        <textarea
          id="dlg-body"
          name="bodyMarkdown"
          required
          className={textAreaClass}
        />
      </FormField>

      <div className="flex items-center gap-[8px]">
        <input
          id="dlg-subscribe-self"
          name="subscribeSelf"
          type="checkbox"
          defaultChecked
          className="h-[16px] w-[16px]"
        />
        <label htmlFor="dlg-subscribe-self" className="lcars-text text-[14px]">
          Mich über neue Nachrichten in diesem Gespräch benachrichtigen
        </label>
      </div>

      <SubmitButton
        pending={pending}
        pendingLabel="Wird angelegt…"
        className="lcars-switch self-start disabled:opacity-50 w-[100%]"
      >
        Gespräch beginnen
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}

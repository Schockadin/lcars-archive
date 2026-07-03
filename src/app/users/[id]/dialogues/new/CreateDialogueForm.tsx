"use client";
import { useActionState } from "react";
import { createDialogueAction, type CreateDialogueState } from "./actions";
import type { CharacterWithOwner } from "@/lib/characters";

const initialState: CreateDialogueState = {};

const inputClass =
  "rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber";

export default function CreateDialogueForm({
  userId,
  ownCharacters,
  partnerCharacters,
  locations,
}: {
  userId: number;
  ownCharacters: { id: number; slug: string; name: string }[];
  partnerCharacters: CharacterWithOwner[];
  locations: { slug: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createDialogueAction,
    initialState,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-[16px] max-w-[420px]">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-own-character" className="lcars-eyebrow">
          Dein Charakter
        </label>
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
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-partner-character" className="lcars-eyebrow">
          Gesprächspartner
        </label>
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
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-title" className="lcars-eyebrow">
          Titel
        </label>
        <input id="dlg-title" name="title" type="text" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-setting" className="lcars-eyebrow">
          Schauplatz
        </label>
        <input id="dlg-setting" name="setting" type="text" className={inputClass} />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-location" className="lcars-eyebrow">
          Ort
        </label>
        <select id="dlg-location" name="locationSlug" defaultValue="" className={inputClass}>
          <option value="">Kein Ort</option>
          {locations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-date" className="lcars-eyebrow">
          Datum
        </label>
        <input
          id="dlg-date"
          name="logDate"
          type="date"
          defaultValue={today}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-tags" className="lcars-eyebrow">
          Tags (kommagetrennt)
        </label>
        <input id="dlg-tags" name="tags" type="text" className={inputClass} />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="dlg-body" className="lcars-eyebrow">
          Erste Nachricht
        </label>
        <textarea
          id="dlg-body"
          name="bodyMarkdown"
          required
          className={`${inputClass} min-h-[120px] resize-y font-mono`}
        />
        <p className="text-lcars-text-dim text-[12px]">
          Unterstützt Markdown-Formatierung.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
      >
        {pending ? "Wird angelegt…" : "Gespräch beginnen"}
      </button>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

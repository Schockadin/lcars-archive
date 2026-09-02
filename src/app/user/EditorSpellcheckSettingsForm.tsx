"use client";

import { useActionState, useState } from "react";
import {
  updateEditorSpellcheckSettingsAction,
  type EditorSpellcheckSettingsState,
} from "@/app/actions/editorPreferences";
import { SaveFooter } from "@/app/_shared/FormPrimitives";

const initialState: EditorSpellcheckSettingsState = {};

// Einzelner Checkbox-Toggle, gleiches Muster wie NotificationSettingsForm.tsx
// (unkontrollierte Checkbox + saveCount-Key, damit die Anzeige nach dem
// Speichern sofort den bestätigten statt des ursprünglichen enabled-Props
// zeigt — sonst derselbe optische Bug wie dort).
export default function EditorSpellcheckSettingsForm({
  enabled,
}: {
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateEditorSpellcheckSettingsAction,
    initialState,
  );

  const [saveCount, setSaveCount] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setSaveCount((c) => c + 1);
  }

  const checked = state.success ? !!state.enabled : enabled;

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <div className="flex items-center gap-[10px]">
        <input
          key={`spellcheck-${saveCount}`}
          id="spellcheckEnabled"
          name="spellcheckEnabled"
          type="checkbox"
          defaultChecked={checked}
          className="lcars-checkbox"
        />
        <label htmlFor="spellcheckEnabled" className="lcars-eyebrow">
          Rechtschreibprüfung in Editor-Feldern
        </label>
      </div>

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

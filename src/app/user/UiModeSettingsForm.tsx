"use client";
import { useActionState, useEffect, useState } from "react";
import { updateUiModeAction, type UiModeState } from "./uiModeActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import ChoiceCardGroup from "@/app/_shared/ChoiceCardGroup";
import {
  UI_MODE_LCARS,
  UI_MODE_MINIMAL,
  isMinimalUiMode,
  normalizeUiMode,
  type UiMode,
} from "@/lib/uiMode";

const initialState: UiModeState = {};

interface UiModeOption {
  id: UiMode;
  label: string;
  description: string;
}

const UI_MODE_OPTIONS: UiModeOption[] = [
  {
    id: UI_MODE_LCARS,
    label: "LCARS",
    description:
      "Das gewohnte Star-Trek-Interface mit Elbows, Farbbalken und Versalien.",
  },
  {
    id: UI_MODE_MINIMAL,
    label: "Minimalistisch",
    description:
      "Schlanke, flache Oberfläche mit Systemschrift — ganz ohne LCARS-Chrome. Hell oder dunkel stellst du separat unter „Hell/Dunkel“ ein.",
  },
];

// Wendet den UI-Modus sofort clientseitig an (Live-Vorschau): data-ui="minimal"
// aktiviert minimal-ui.css, das Entfernen zeigt wieder das volle LCARS-Design.
function applyPreview(mode: UiMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isMinimalUiMode(mode)) {
    root.setAttribute("data-ui", UI_MODE_MINIMAL);
  } else {
    root.removeAttribute("data-ui");
  }
}

// UI-Modus-Auswahl im Profil (/user). Radio-Karten wie bei der Theme-Auswahl;
// die Vorschau greift sofort, gespeichert wird erst mit „Speichern".
export default function UiModeSettingsForm({
  currentMode,
}: {
  currentMode: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateUiModeAction,
    initialState,
  );

  const [selected, setSelected] = useState<UiMode>(() =>
    normalizeUiMode(currentMode),
  );

  useEffect(() => {
    applyPreview(selected);
  }, [selected]);

  return (
    <form action={formAction} className="flex flex-col gap-[20px]">
      <input type="hidden" name="uiMode" value={selected} />

      <p className="text-lcars-ink-dim text-[13px]">
        Die Vorschau erscheint sofort; gespeichert wird sie erst mit
        „Speichern“.
      </p>

      <ChoiceCardGroup
        name="ui-mode-choice"
        ariaLabel="Oberfläche"
        options={UI_MODE_OPTIONS}
        selected={selected}
        onSelect={setSelected}
      />

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

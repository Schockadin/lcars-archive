"use client";
import { useActionState, useEffect, useState } from "react";
import { updateColorModeAction, type ColorModeState } from "./colorModeActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import ChoiceCardGroup from "@/app/_shared/ChoiceCardGroup";
import {
  COLOR_MODE_DARK,
  COLOR_MODE_LIGHT,
  isLightMode,
  normalizeColorMode,
  type ColorMode,
} from "@/lib/colorMode";

const initialState: ColorModeState = {};

interface ColorModeOption {
  id: ColorMode;
  label: string;
  description: string;
}

const COLOR_MODE_OPTIONS: ColorModeOption[] = [
  {
    id: COLOR_MODE_DARK,
    label: "Dunkel",
    description: "Heller Text auf dunklem Grund — der gewohnte Look.",
  },
  {
    id: COLOR_MODE_LIGHT,
    label: "Hell",
    description: "Dunkler Text auf hellem Grund. Gilt für LCARS wie minimal.",
  },
];

// Wendet den Hell/Dunkel-Modus sofort clientseitig an (Live-Vorschau):
// data-mode="light" aktiviert das helle Schema (color-mode.css), das Entfernen
// zeigt wieder das dunkle. Unabhängig vom UI-Modus (data-ui) und Farbthema
// (data-theme).
function applyPreview(mode: ColorMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isLightMode(mode)) {
    root.setAttribute("data-mode", COLOR_MODE_LIGHT);
  } else {
    root.removeAttribute("data-mode");
  }
}

// Hell/Dunkel-Auswahl im Profil (/user). Radio-Karten wie bei der Theme-/
// UI-Auswahl; die Vorschau greift sofort, gespeichert wird erst mit „Speichern".
export default function ColorModeSettingsForm({
  currentMode,
}: {
  currentMode: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateColorModeAction,
    initialState,
  );

  const [selected, setSelected] = useState<ColorMode>(() =>
    normalizeColorMode(currentMode),
  );

  useEffect(() => {
    applyPreview(selected);
  }, [selected]);

  return (
    <form action={formAction} className="flex flex-col gap-[20px]">
      <input type="hidden" name="colorMode" value={selected} />

      <p className="text-lcars-ink-dim text-[13px]">
        Die Vorschau erscheint sofort; gespeichert wird sie erst mit
        „Speichern“.
      </p>

      <ChoiceCardGroup
        name="color-mode-choice"
        ariaLabel="Hell/Dunkel"
        options={COLOR_MODE_OPTIONS}
        selected={selected}
        onSelect={setSelected}
      />

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

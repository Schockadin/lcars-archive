"use client";
import { useActionState, useEffect, useState } from "react";
import { updateUiModeAction, type UiModeState } from "./uiModeActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import {
  UI_MODE_LCARS,
  UI_MODE_MINIMAL,
  UI_MODE_MINIMAL_LIGHT,
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
    label: "Minimalistisch (dunkel)",
    description:
      "Schlanke, flache Oberfläche mit Systemschrift auf dunklem Grund — ganz ohne LCARS-Chrome.",
  },
  {
    id: UI_MODE_MINIMAL_LIGHT,
    label: "Minimalistisch (hell)",
    description:
      "Dieselbe schlanke Oberfläche, aber mit hellem Hintergrund und dunklem Text.",
  },
];

// Wendet den UI-Modus sofort clientseitig an (Live-Vorschau): data-ui="minimal"
// aktiviert minimal-ui.css, das Entfernen zeigt wieder das volle LCARS-Design.
function applyPreview(mode: UiMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isMinimalUiMode(mode)) {
    // data-ui trägt die konkrete Variante ("minimal" oder "minimal-light"),
    // damit die Live-Vorschau auch das helle Schema zeigt.
    root.setAttribute("data-ui", mode);
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
        Wähle, wie die Oberfläche aussehen soll. Die Vorschau erscheint sofort;
        gespeichert wird sie erst mit „Speichern“ und bleibt dann bei jedem
        Login erhalten.
      </p>

      <div
        role="radiogroup"
        aria-label="Oberfläche"
        className="flex flex-col gap-[8px]"
      >
        {UI_MODE_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`relative flex items-center gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
                isSelected
                  ? "border-lcars-primary bg-lcars-surface-2"
                  : "border-lcars-border bg-lcars-surface"
              }`}
            >
              <input
                type="radio"
                name="ui-mode-choice"
                value={option.id}
                checked={isSelected}
                onChange={() => setSelected(option.id)}
                className="sr-only"
              />
              <span className="flex flex-col">
                <span
                  className={`lcars-eyebrow ${
                    isSelected ? "text-lcars-primary" : "text-lcars-ink-light"
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-lcars-ink-dim text-[12px]">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

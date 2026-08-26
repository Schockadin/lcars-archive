"use client";
import { useActionState, useState } from "react";
import {
  updateColorThemeAction,
  type ColorThemeState,
} from "./colorThemeActions";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  normalizeThemeId,
} from "@/lib/themes";

const initialState: ColorThemeState = {};

// Wendet ein Theme sofort clientseitig an (Live-Vorschau), noch bevor
// gespeichert wird. "standard" = kein Attribut (unveränderte :root-Werte,
// siehe src/styles/lcars-themes.css). Erst das Speichern macht die Wahl
// dauerhaft; bis dahin setzt eine Server-Render den Wert wieder zurück.
function applyThemePreview(theme: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === DEFAULT_THEME_ID) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

// Theme-Auswahl im Profil (/user). Radio-Karten mit kleiner Farbvorschau;
// die Auswahl wird sofort als Live-Vorschau angewandt und per Formular
// persistiert.
export default function ThemeSettingsForm({
  currentTheme,
}: {
  currentTheme: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateColorThemeAction,
    initialState,
  );

  const [selected, setSelected] = useState(() =>
    normalizeThemeId(currentTheme),
  );

  function handleSelect(theme: string) {
    setSelected(theme);
    applyThemePreview(theme);
  }

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <p className="text-lcars-text-dim text-[13px]">
        Wähle das Farbschema der Oberfläche. Die Vorschau erscheint sofort;
        gespeichert wird sie erst mit „Speichern“ und bleibt dann bei jedem
        Login erhalten.
      </p>

      <div
        role="radiogroup"
        aria-label="Farbtheme"
        className="flex flex-col gap-[8px]"
      >
        {COLOR_THEMES.map((theme) => {
          const isSelected = selected === theme.id;
          return (
            <label
              key={theme.id}
              className={`flex items-center gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
                isSelected
                  ? "border-lcars-amber bg-lcars-surface-2"
                  : "border-lcars-border bg-lcars-surface"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={theme.id}
                checked={isSelected}
                onChange={() => handleSelect(theme.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="flex shrink-0 gap-[3px]"
                title={`Farben: ${theme.swatch.join(", ")}`}
              >
                {theme.swatch.map((hex, i) => (
                  <span
                    key={i}
                    className="inline-block w-[16px] h-[16px] rounded-full border border-black/30"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </span>
              <span className="flex flex-col">
                <span
                  className={`lcars-eyebrow ${
                    isSelected ? "text-lcars-amber" : "text-lcars-text-light"
                  }`}
                >
                  {theme.label}
                </span>
                <span className="text-lcars-text-dim text-[12px]">
                  {theme.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>Gespeichert.</FormSuccess>}

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>
    </form>
  );
}

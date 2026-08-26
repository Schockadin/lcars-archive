"use client";
import { useActionState, useEffect, useState } from "react";
import {
  updateColorThemeAction,
  type ColorThemeState,
} from "./colorThemeActions";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  THEME_TOKENS,
  getTheme,
  themeSwatch,
  normalizeThemeId,
  sanitizeThemeOverrides,
  type ThemeOverrides,
  type TokenId,
} from "@/lib/themes";

const initialState: ColorThemeState = {};

// Wendet Basis-Theme + Individualisierung sofort clientseitig an (Live-
// Vorschau). "standard" = kein data-theme (unveränderte :root-Werte). Für nicht
// überschriebene Tokens werden etwaige Inline-Overrides wieder entfernt, damit
// der Basis-Theme-Wert durchscheint. Inline-Style auf <html> gewinnt gegen jede
// Stylesheet-Regel — deshalb --lcars-<id> UND --color-lcars-<id> (Tailwind).
function applyPreview(themeId: string, overrides: ThemeOverrides) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (themeId === DEFAULT_THEME_ID) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", themeId);
  }
  for (const { id } of THEME_TOKENS) {
    const v = overrides[id];
    if (v) {
      root.style.setProperty(`--lcars-${id}`, v);
      root.style.setProperty(`--color-lcars-${id}`, v);
    } else {
      root.style.removeProperty(`--lcars-${id}`);
      root.style.removeProperty(`--color-lcars-${id}`);
    }
  }
}

// Theme-Auswahl + Individualisierung im Profil (/user). Radio-Karten fürs
// Basis-Theme, darunter je Akzent-Token ein Farbwähler mit „Zurücksetzen".
export default function ThemeSettingsForm({
  currentTheme,
  currentOverrides,
}: {
  currentTheme: string;
  currentOverrides: ThemeOverrides;
}) {
  const [state, formAction, pending] = useActionState(
    updateColorThemeAction,
    initialState,
  );

  const [selected, setSelected] = useState(() => normalizeThemeId(currentTheme));
  const [overrides, setOverrides] = useState<ThemeOverrides>(() =>
    sanitizeThemeOverrides(currentOverrides),
  );

  // Vorschau bei jeder Änderung anwenden.
  useEffect(() => {
    applyPreview(selected, overrides);
  }, [selected, overrides]);

  const baseTokens = getTheme(selected).tokens;
  const hasOverrides = Object.keys(overrides).length > 0;

  function handleSelectTheme(themeId: string) {
    setSelected(themeId);
  }

  function handleColor(id: TokenId, value: string) {
    setOverrides((prev) => ({ ...prev, [id]: value.toLowerCase() }));
  }

  function resetToken(id: TokenId) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function resetAll() {
    setOverrides({});
  }

  return (
    <form action={formAction} className="flex flex-col gap-[20px]">
      <input type="hidden" name="theme" value={selected} />
      <input type="hidden" name="overrides" value={JSON.stringify(overrides)} />

      <div className="flex flex-col gap-[8px]">
        <p className="text-lcars-text-dim text-[13px]">
          Wähle ein Basis-Farbschema. Die Vorschau erscheint sofort; gespeichert
          wird sie erst mit „Speichern“ und bleibt dann bei jedem Login erhalten.
        </p>

        <div
          role="radiogroup"
          aria-label="Basis-Farbschema"
          className="flex flex-col gap-[8px]"
        >
          {COLOR_THEMES.map((theme) => {
            const isSelected = selected === theme.id;
            return (
              <label
                key={theme.id}
                className={`flex items-center gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
                  isSelected
                    ? "border-lcars-primary bg-lcars-surface-2"
                    : "border-lcars-border bg-lcars-surface"
                }`}
              >
                <input
                  type="radio"
                  name="theme-choice"
                  value={theme.id}
                  checked={isSelected}
                  onChange={() => handleSelectTheme(theme.id)}
                  className="sr-only"
                />
                <span aria-hidden className="flex shrink-0 gap-[3px]">
                  {themeSwatch(theme).map((hex, i) => (
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
                      isSelected ? "text-lcars-primary" : "text-lcars-text-light"
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
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between gap-[12px]">
          <h3 className="!mt-0">Feineinstellung</h3>
          {hasOverrides && (
            <button
              type="button"
              onClick={resetAll}
              className="lcars-pill-btn--outline text-[12px] px-[12px] py-[4px]"
            >
              Alle zurücksetzen
            </button>
          )}
        </div>
        <p className="text-lcars-text-dim text-[13px]">
          Optional: einzelne Akzentfarben mit eigenen Farben überschreiben. Ohne
          Überschreibung gilt der Wert des Basis-Themes.
        </p>

        <div className="flex flex-col gap-[8px]">
          {THEME_TOKENS.map(({ id, label }) => {
            const overridden = overrides[id] !== undefined;
            const value = overrides[id] ?? baseTokens[id];
            return (
              <div key={id} className="flex items-center gap-[12px]">
                <input
                  type="color"
                  aria-label={`${label} – Farbe wählen`}
                  value={value}
                  onChange={(e) => handleColor(id, e.target.value)}
                  className="h-[32px] w-[44px] shrink-0 cursor-pointer rounded-[6px] border border-lcars-border bg-transparent p-[2px]"
                />
                <span className="flex flex-1 flex-col">
                  <span className="lcars-eyebrow text-lcars-text-light">
                    {label}
                  </span>
                  <span className="text-lcars-text-dim text-[12px] font-lcars-mono">
                    {value}
                    {overridden ? " · eigene Farbe" : " · Theme-Standard"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => resetToken(id)}
                  disabled={!overridden}
                  className="lcars-pill-btn--outline text-[12px] px-[12px] py-[4px] disabled:opacity-40"
                >
                  Zurücksetzen
                </button>
              </div>
            );
          })}
        </div>
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

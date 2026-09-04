"use client";
import { useActionState, useEffect, useState } from "react";
import {
  updateColorThemeAction,
  type ColorThemeState,
} from "./colorThemeActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import {
  BASE_TOKENS,
  BASE_TOKEN_DEFAULTS,
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  OVERRIDE_TOKEN_VARS,
  THEME_TOKENS,
  getTheme,
  themeSwatch,
  normalizeThemeId,
  sanitizeThemeOverrides,
  type OverrideTokenId,
  type ThemeOverrides,
} from "@/lib/themes";
import { isLightMode, normalizeColorMode } from "@/lib/colorMode";

const initialState: ColorThemeState = {};

// Wendet Basis-Theme + Individualisierung sofort clientseitig an (Live-
// Vorschau). "standard" = kein data-theme (unveränderte :root-Werte). Für nicht
// überschriebene Tokens werden etwaige Inline-Overrides wieder entfernt, damit
// der Basis-Theme-Wert durchscheint. Inline-Style auf <html> gewinnt gegen jede
// Stylesheet-Regel — deshalb --lcars-<suffix> UND --color-lcars-<suffix>
// (Tailwind). Eine Override-ID kann mehrere CSS-Variablen setzen (siehe
// OVERRIDE_TOKEN_VARS: "ink" → ink + ink-light), daher pro ID über alle Suffixe.
function applyPreview(themeId: string, overrides: ThemeOverrides) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (themeId === DEFAULT_THEME_ID) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", themeId);
  }
  for (const [id, suffixes] of Object.entries(OVERRIDE_TOKEN_VARS)) {
    const v = overrides[id as OverrideTokenId];
    for (const suffix of suffixes) {
      if (v) {
        root.style.setProperty(`--lcars-${suffix}`, v);
        root.style.setProperty(`--color-lcars-${suffix}`, v);
      } else {
        root.style.removeProperty(`--lcars-${suffix}`);
        root.style.removeProperty(`--color-lcars-${suffix}`);
      }
    }
  }
}

// Theme-Auswahl + Individualisierung im Profil (/user). Radio-Karten fürs
// Basis-Theme, darunter je Akzent-Token ein Farbwähler mit „Zurücksetzen"
// sowie die frei wählbaren Basisfarben (Hintergrund + Schrift).
export default function ThemeSettingsForm({
  currentTheme,
  currentOverrides,
  currentMode,
}: {
  currentTheme: string;
  currentOverrides: ThemeOverrides;
  currentMode: string;
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
  // Default-Anzeige der Basisfarben-Wähler richtet sich nach dem Hell/Dunkel-
  // Modus (dunkler bzw. heller Grund), solange kein eigener Wert gesetzt ist.
  const baseDefaults =
    BASE_TOKEN_DEFAULTS[isLightMode(normalizeColorMode(currentMode)) ? "light" : "dark"];
  const hasOverrides = Object.keys(overrides).length > 0;

  function handleSelectTheme(themeId: string) {
    setSelected(themeId);
  }

  function handleColor(id: OverrideTokenId, value: string) {
    setOverrides((prev) => ({ ...prev, [id]: value.toLowerCase() }));
  }

  function resetToken(id: OverrideTokenId) {
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
        <p className="text-lcars-ink-dim text-[13px]">
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
                className={`relative flex items-center gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
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
                      isSelected ? "text-lcars-primary" : "text-lcars-ink-light"
                    }`}
                  >
                    {theme.label}
                  </span>
                  <span className="text-lcars-ink-dim text-[12px]">
                    {theme.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        <h3 className="!mt-0">Hintergrund &amp; Schrift</h3>
        <p className="text-lcars-ink-dim text-[13px]">
          Optional: Seitenhintergrund und Schriftfarbe frei wählen. Ohne
          Überschreibung gilt der Standard des gewählten Hell/Dunkel-Modus.
        </p>

        <div className="flex flex-col gap-[8px]">
          {BASE_TOKENS.map(({ id, label }) => {
            const overridden = overrides[id] !== undefined;
            const value = overrides[id] ?? baseDefaults[id];
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
                  <span className="lcars-eyebrow text-lcars-ink-light">
                    {label}
                  </span>
                  <span className="text-lcars-ink-dim text-[12px] font-lcars-mono">
                    {value}
                    {overridden ? " · eigene Farbe" : " · Modus-Standard"}
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
        <p className="text-lcars-ink-dim text-[13px]">
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
                  <span className="lcars-eyebrow text-lcars-ink-light">
                    {label}
                  </span>
                  <span className="text-lcars-ink-dim text-[12px] font-lcars-mono">
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

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

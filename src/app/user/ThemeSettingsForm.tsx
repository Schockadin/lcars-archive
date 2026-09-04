"use client";
import { useActionState, useEffect, useState } from "react";
import {
  updateColorThemeAction,
  type ColorThemeState,
} from "./colorThemeActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import {
  BASE_TOKEN_DEFAULTS,
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  INK_TOKENS,
  OVERRIDE_TOKEN_VARS,
  SURFACE_TOKENS,
  THEME_TOKENS,
  getTheme,
  themeSwatch,
  normalizeThemeId,
  sanitizeThemeOverrides,
  type BaseTokenId,
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
// (Tailwind). Die Suffixe je Token liefert OVERRIDE_TOKEN_VARS.
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

// Eine Farbwähler-Zeile: Farbfeld, Beschriftung samt Erklärung, aktueller Wert
// und „Zurücksetzen" (nur aktiv, solange eine eigene Farbe gesetzt ist).
function ColorRow({
  id,
  label,
  hint,
  value,
  overridden,
  onChange,
  onReset,
}: {
  id: OverrideTokenId;
  label: string;
  hint?: string;
  value: string;
  overridden: boolean;
  onChange: (id: OverrideTokenId, value: string) => void;
  onReset: (id: OverrideTokenId) => void;
}) {
  return (
    <div className="flex items-center gap-[12px]">
      <input
        type="color"
        aria-label={`${label} – Farbe wählen`}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        className="h-[32px] w-[44px] shrink-0 cursor-pointer rounded-[6px] border border-lcars-border bg-transparent p-[2px]"
      />
      <span className="flex flex-1 flex-col">
        <span className="lcars-eyebrow text-lcars-ink-light">{label}</span>
        {hint && (
          <span className="text-lcars-ink-dim text-[12px]">{hint}</span>
        )}
        <span className="text-lcars-ink-dim text-[12px] font-lcars-mono">
          {value}
          {overridden ? " · eigene Farbe" : " · Standard"}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onReset(id)}
        disabled={!overridden}
        className="lcars-pill-btn--outline text-[12px] px-[12px] py-[4px] disabled:opacity-40"
      >
        Zurücksetzen
      </button>
    </div>
  );
}

// Theme-Auswahl + Individualisierung im Profil (/user). Vier aufklappbare
// Panels (SettingsPanel): Basis-Farbschema, Flächen, Schriftfarben und
// Akzentfarben — alles in EINEM Formular mit einem gemeinsamen „Speichern".
// Ohne die Panels stünden hier über zwanzig Farbwähler untereinander.
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

  const accentDefaults = getTheme(selected).tokens;
  // Default-Anzeige der Basisfarben richtet sich nach dem Hell/Dunkel-Modus,
  // solange kein eigener Wert gesetzt ist.
  const baseDefaults =
    BASE_TOKEN_DEFAULTS[
      isLightMode(normalizeColorMode(currentMode)) ? "light" : "dark"
    ];

  const overrideCount = Object.keys(overrides).length;

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

  // Anzahl eigener Farben innerhalb einer Gruppe — steht als Kurzinfo rechts
  // in der Panel-Kopfzeile, damit man zugeklappt sieht, wo etwas gesetzt ist.
  function countIn(ids: readonly string[]): number {
    return ids.filter((id) => overrides[id as OverrideTokenId] !== undefined)
      .length;
  }

  function groupBadge(ids: readonly string[]): string {
    const n = countIn(ids);
    return n === 0 ? "Standard" : `${n} eigene`;
  }

  const surfaceIds = SURFACE_TOKENS.map((t) => t.id);
  const inkIds = INK_TOKENS.map((t) => t.id);
  const accentIds = THEME_TOKENS.map((t) => t.id);

  return (
    <form action={formAction} className="flex flex-col gap-[12px]">
      <input type="hidden" name="theme" value={selected} />
      <input type="hidden" name="overrides" value={JSON.stringify(overrides)} />

      <div className="flex items-center justify-between gap-[12px]">
        <p className="text-lcars-ink-dim text-[13px]">
          Die Vorschau erscheint sofort; gespeichert wird sie erst mit
          „Speichern“ und bleibt dann bei jedem Login erhalten.
        </p>
        {overrideCount > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="lcars-pill-btn--outline shrink-0 text-[12px] px-[12px] py-[4px]"
          >
            Alle zurücksetzen
          </button>
        )}
      </div>

      <SettingsPanel
        title="Farbschema"
        hint="Basis-Palette der Akzentfarben"
        badge={getTheme(selected).label}
        defaultOpen
      >
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
                  onChange={() => setSelected(theme.id)}
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
      </SettingsPanel>

      <SettingsPanel
        title="Hintergrund & Flächen"
        hint="Seitenhintergrund, Panels und Rahmen"
        badge={groupBadge(surfaceIds)}
      >
        {SURFACE_TOKENS.map(({ id, label, hint }) => (
          <ColorRow
            key={id}
            id={id}
            label={label}
            hint={hint}
            value={overrides[id] ?? baseDefaults[id as BaseTokenId]}
            overridden={overrides[id] !== undefined}
            onChange={handleColor}
            onReset={resetToken}
          />
        ))}
      </SettingsPanel>

      <SettingsPanel
        title="Schriftfarben"
        hint="Jede Textrolle einzeln einstellbar"
        badge={groupBadge(inkIds)}
      >
        {INK_TOKENS.map(({ id, label, hint }) => (
          <ColorRow
            key={id}
            id={id}
            label={label}
            hint={hint}
            value={overrides[id] ?? baseDefaults[id as BaseTokenId]}
            overridden={overrides[id] !== undefined}
            onChange={handleColor}
            onReset={resetToken}
          />
        ))}
      </SettingsPanel>

      <SettingsPanel
        title="Akzentfarben"
        hint="Feineinstellung der Farben des Basis-Schemas"
        badge={groupBadge(accentIds)}
      >
        {THEME_TOKENS.map(({ id, label }) => (
          <ColorRow
            key={id}
            id={id}
            label={label}
            value={overrides[id] ?? accentDefaults[id]}
            overridden={overrides[id] !== undefined}
            onChange={handleColor}
            onReset={resetToken}
          />
        ))}
      </SettingsPanel>

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

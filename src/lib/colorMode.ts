// Hell-/Dunkel-Modus der Oberfläche — eine EIGENE Achse, unabhängig vom
// UI-Modus (LCARS vs. minimalistisch, siehe src/lib/uiMode.ts) und vom
// Akzent-Farbthema (siehe src/lib/themes.ts). Jede Kombination ist erlaubt:
// LCARS-dunkel, LCARS-hell, minimal-dunkel, minimal-hell.
//
// Angelehnt an die Farbthemes/den UI-Modus: angemeldete Personen wählen den
// Modus im Profil (/user); er wird als users.color_mode gespeichert und — analog
// zu neo_theme/neo_ui — in ein JS-lesbares Cookie (neo_mode) gespiegelt, damit
// das Pre-Paint-Skript im Root-Layout (src/app/layout.tsx) das Attribut
// data-mode="light" auf <html> setzt, bevor überhaupt etwas gezeichnet wird
// (kein FOUC). "dark" ist der Default und setzt KEIN Attribut (die :root-Werte
// aus tokens.css sind bereits dunkel).
//
// Rein CSS-basiert (data-mode-Attribut, siehe src/styles/color-mode.css), damit
// die statische Vorab-Renderung des Root-Layouts (Cache Components) erhalten
// bleibt und keine Hydration-Mismatches entstehen.
//
// Bewusst OHNE "server-only": dieselbe Registry wird server- (Layout,
// Server-Action, session.ts) UND clientseitig (Profil-Formular, ThemeApplier)
// importiert.

export const COLOR_MODE_COOKIE_NAME = "neo_mode";

export const COLOR_MODE_DARK = "dark";
export const COLOR_MODE_LIGHT = "light";

export const DEFAULT_COLOR_MODE = COLOR_MODE_DARK;

export type ColorMode = typeof COLOR_MODE_DARK | typeof COLOR_MODE_LIGHT;

export function isValidColorMode(mode: string): mode is ColorMode {
  return mode === COLOR_MODE_DARK || mode === COLOR_MODE_LIGHT;
}

// Unbekannte/veraltete Werte still auf den Default (dunkel) normalisieren.
export function normalizeColorMode(mode: string | null | undefined): ColorMode {
  return mode && isValidColorMode(mode) ? mode : DEFAULT_COLOR_MODE;
}

export function isLightMode(mode: string | null | undefined): boolean {
  return normalizeColorMode(mode) === COLOR_MODE_LIGHT;
}

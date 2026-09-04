// UI-Modus der Oberfläche: entweder das volle LCARS-Design ("lcars", Default)
// oder ein schlankes, minimalistisches UI ("minimal"), das die dekorative
// LCARS-Chrome (Elbows, Farbbalken, Pills, Versalien) deaktiviert. Angelehnt an
// die Farbthemes (src/lib/themes.ts): angemeldete Personen wählen den Modus im
// Profil (/user); er wird als users.ui_mode gespeichert und — analog zu
// neo_theme — in ein JS-lesbares Cookie gespiegelt, damit das Pre-Paint-Skript
// im Root-Layout (src/app/layout.tsx) das Attribut data-ui="minimal" auf <html>
// setzt, bevor überhaupt etwas gezeichnet wird (kein FOUC).
//
// Rein CSS-basiert (data-ui-Attribut, siehe src/styles/minimal-ui.css) statt
// über bedingtes Rendern — so bleibt die statische Vorab-Renderung des
// Root-Layouts (Cache Components) erhalten und es gibt keine Hydration-
// Mismatches.
//
// Bewusst OHNE "server-only": dieselbe Registry wird server- (Layout,
// Server-Action, session.ts) UND clientseitig (Profil-Formular, ThemeApplier)
// importiert.

export const UI_MODE_COOKIE_NAME = "neo_ui";

export const UI_MODE_LCARS = "lcars";
// Das minimalistische UI gibt es in zwei Ausführungen: dunkel (der bisherige
// Wert "minimal", aus Kompatibilität unverändert) und hell ("minimal-light").
// Beide teilen sich dieselbe schlanke Optik (minimal-ui.css, Selektor
// data-ui^="minimal"); "minimal-light" überschreibt zusätzlich die
// Hintergrund-/Textfarben auf ein helles Schema.
export const UI_MODE_MINIMAL = "minimal";
export const UI_MODE_MINIMAL_LIGHT = "minimal-light";

export const DEFAULT_UI_MODE = UI_MODE_LCARS;

export type UiMode =
  | typeof UI_MODE_LCARS
  | typeof UI_MODE_MINIMAL
  | typeof UI_MODE_MINIMAL_LIGHT;

export function isValidUiMode(mode: string): mode is UiMode {
  return (
    mode === UI_MODE_LCARS ||
    mode === UI_MODE_MINIMAL ||
    mode === UI_MODE_MINIMAL_LIGHT
  );
}

// Unbekannte/veraltete Werte still auf den Default (LCARS) normalisieren.
export function normalizeUiMode(mode: string | null | undefined): UiMode {
  return mode && isValidUiMode(mode) ? mode : DEFAULT_UI_MODE;
}

// Beide Minimal-Varianten (hell wie dunkel) zählen als „minimalistisches UI".
export function isMinimalUiMode(mode: string | null | undefined): boolean {
  const m = normalizeUiMode(mode);
  return m === UI_MODE_MINIMAL || m === UI_MODE_MINIMAL_LIGHT;
}

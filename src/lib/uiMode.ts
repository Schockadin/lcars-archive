// UI-Modus der Oberfläche: entweder das volle LCARS-Design ("lcars", Default)
// oder ein schlankes, minimalistisches UI ("minimal"), das die dekorative
// LCARS-Chrome (Elbows, Farbbalken, Pills, Versalien) deaktiviert. Angelehnt an
// die Farbthemes (src/lib/themes.ts): angemeldete Personen wählen den Modus im
// Profil (/user); er wird als users.ui_mode gespeichert und — analog zu
// neo_theme — in ein JS-lesbares Cookie gespiegelt, damit das Pre-Paint-Skript
// im Root-Layout (src/app/layout.tsx) das Attribut data-ui="minimal" auf <html>
// setzt, bevor überhaupt etwas gezeichnet wird (kein FOUC).
//
// Hell/Dunkel ist KEIN UI-Modus mehr, sondern eine eigene Achse (data-mode,
// siehe src/lib/colorMode.ts): jede Kombination ist erlaubt (LCARS-hell,
// minimal-dunkel, …). Der frühere Wert "minimal-light" wird deshalb nur noch
// rückwärtskompatibel entgegengenommen und auf "minimal" abgebildet; die
// Helligkeit trägt jetzt users.color_mode.
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
export const UI_MODE_MINIMAL = "minimal";

// Alt-Wert aus der Zeit, als das minimalistische UI die Helligkeit selbst trug
// (data-ui="minimal-light"). Wird beim Einlesen auf "minimal" + color_mode
// "light" abgebildet (siehe normalizeUiMode und migrate-pr64.sql). Nur noch für
// die Migration alter Cookies/DB-Werte relevant.
export const UI_MODE_MINIMAL_LIGHT_LEGACY = "minimal-light";

export const DEFAULT_UI_MODE = UI_MODE_LCARS;

export type UiMode = typeof UI_MODE_LCARS | typeof UI_MODE_MINIMAL;

export function isValidUiMode(mode: string): mode is UiMode {
  return mode === UI_MODE_LCARS || mode === UI_MODE_MINIMAL;
}

// Unbekannte/veraltete Werte still auf den Default (LCARS) normalisieren; den
// Alt-Wert "minimal-light" auf "minimal" abbilden (die Helligkeit lebt jetzt in
// color_mode).
export function normalizeUiMode(mode: string | null | undefined): UiMode {
  if (mode === UI_MODE_MINIMAL_LIGHT_LEGACY) return UI_MODE_MINIMAL;
  return mode && isValidUiMode(mode) ? mode : DEFAULT_UI_MODE;
}

export function isMinimalUiMode(mode: string | null | undefined): boolean {
  return normalizeUiMode(mode) === UI_MODE_MINIMAL;
}

// Leitet aus einem Alt-Wert die Helligkeit ab: "minimal-light" ⇒ light, sonst
// dark. Genutzt beim Spiegeln alter Cookies/DB-Werte, damit Bestandsnutzer:innen
// mit hellem Minimal-UI nach dem Update weiterhin hell sehen.
export function legacyColorModeFromUiMode(
  mode: string | null | undefined,
): "light" | "dark" {
  return mode === UI_MODE_MINIMAL_LIGHT_LEGACY ? "light" : "dark";
}

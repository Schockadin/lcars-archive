// Die Schriftwahl der Oberfläche — zwei eigene Achsen neben Farbthema
// (themes.ts), Hell/Dunkel (colorMode.ts) und UI-Modus (uiMode.ts):
//
//   Fließtext-/Überschriftenschrift  (users.font_sans, Cookie neo_font_sans)
//   Mono-/Datenschrift               (users.font_mono, Cookie neo_font_mono)
//
// Vorgabe bleibt, was das Archiv immer hatte: Antonio für die Beschriftungen
// und Share Tech Mono für die Datenzeilen — zusammen der LCARS-Eindruck. Wem
// die schmalen Versalien schwer zu lesen sind, kann jede der beiden Rollen
// auf eine gängige Alternative umstellen, ohne die andere anzufassen.
//
// Wie überall in der Darstellung rein CSS-basiert: die Wahl landet als
// data-font-sans/data-font-mono auf <html> (Pre-Paint-Skript in
// src/app/layout.tsx), und src/styles/fonts.css hängt dort die beiden
// kanonischen Stacks --lcars-font-sans/--lcars-font-mono um. Damit bleibt die
// statische Vorab-Renderung des Root-Layouts erhalten (Cache Components) und
// es gibt keine Hydration-Mismatches.
//
// WICHTIG: Jede hier aufgeführte Schrift muss in src/app/layout.tsx per
// next/font/google geladen (self-hosted, keine Anfrage an Google zur Laufzeit,
// siehe Datenschutzerklärung) und in src/styles/fonts.css unter ihrer id
// eingetragen sein. Ein Test in fonts.test.ts hält die drei Stellen
// deckungsgleich.
//
// Bewusst OHNE "server-only": dieselbe Registry nutzen Layout, Server-Action
// und Session (Server) wie das Profil-Formular und der ThemeApplier (Client).

export const FONT_SANS_COOKIE_NAME = "neo_font_sans";
export const FONT_MONO_COOKIE_NAME = "neo_font_mono";

export const DEFAULT_FONT_SANS = "antonio";
export const DEFAULT_FONT_MONO = "share-tech-mono";

export interface FontOption {
  id: string;
  // Der Name der Schrift, wie er im Profil in der Auswahl steht.
  label: string;
  // Ein Satz dazu, wofür sie sich eignet — die Auswahl ist eine
  // Geschmacksfrage, keine Fachfrage.
  description: string;
  // Die CSS-Variable, die next/font für diese Schrift anmeldet (siehe
  // layout.tsx). Nur zur Prüfung/Dokumentation — die Stacks selbst stehen in
  // src/styles/fonts.css.
  cssVariable: string;
}

// Die Beschriftungsschrift: Überschriften, Menü, Pillen, Fließtext.
export const FONT_SANS_OPTIONS: FontOption[] = [
  {
    id: DEFAULT_FONT_SANS,
    label: "Antonio",
    description:
      "Die Vorgabe: schmale Versalien — die Schrift, die das LCARS-Bild trägt.",
    cssVariable: "--font-antonio",
  },
  {
    id: "inter",
    label: "Inter",
    description:
      "Neutrale Bildschirmschrift, sehr gut lesbar auch in kleinen Größen.",
    cssVariable: "--font-inter",
  },
  {
    id: "roboto",
    label: "Roboto",
    description: "Der vertraute Android-Klassiker — kompakt und ruhig.",
    cssVariable: "--font-roboto",
  },
  {
    id: "open-sans",
    label: "Open Sans",
    description: "Runder und etwas breiter; angenehm für längere Texte.",
    cssVariable: "--font-open-sans",
  },
];

// Die Datenschrift: Meta-Zeilen der Karten, Aktenfelder, Code, Zahlen.
export const FONT_MONO_OPTIONS: FontOption[] = [
  {
    id: DEFAULT_FONT_MONO,
    label: "Share Tech Mono",
    description:
      "Die Vorgabe: die technische Schreibmaschine der Konsolen-Zeilen.",
    cssVariable: "--font-share-tech-mono",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    description: "Für Fließtext gebaute Monospace — hohe x-Höhe, klare Ziffern.",
    cssVariable: "--font-jetbrains-mono",
  },
  {
    id: "roboto-mono",
    label: "Roboto Mono",
    description: "Die Monospace zu Roboto: schlicht und unaufdringlich.",
    cssVariable: "--font-roboto-mono",
  },
  {
    id: "source-code-pro",
    label: "Source Code Pro",
    description: "Etwas breiter gesetzt, mit deutlich unterschiedenen Zeichen.",
    cssVariable: "--font-source-code-pro",
  },
];

export type FontSansId = string;
export type FontMonoId = string;

export function isValidFontSans(id: string): boolean {
  return FONT_SANS_OPTIONS.some((option) => option.id === id);
}

export function isValidFontMono(id: string): boolean {
  return FONT_MONO_OPTIONS.some((option) => option.id === id);
}

// Unbekannte/veraltete Werte still auf die Vorgabe normalisieren — ein
// gelöschter Eintrag in der Registry darf keine Oberfläche zerlegen.
export function normalizeFontSans(id: string | null | undefined): FontSansId {
  return id && isValidFontSans(id) ? id : DEFAULT_FONT_SANS;
}

export function normalizeFontMono(id: string | null | undefined): FontMonoId {
  return id && isValidFontMono(id) ? id : DEFAULT_FONT_MONO;
}

export function fontSansLabel(id: string | null | undefined): string {
  const normalized = normalizeFontSans(id);
  return (
    FONT_SANS_OPTIONS.find((option) => option.id === normalized)?.label ??
    normalized
  );
}

export function fontMonoLabel(id: string | null | undefined): string {
  const normalized = normalizeFontMono(id);
  return (
    FONT_MONO_OPTIONS.find((option) => option.id === normalized)?.label ??
    normalized
  );
}

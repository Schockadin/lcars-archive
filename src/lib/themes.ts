// Farbthemes für die LCARS-Oberfläche. Angelehnt an die kanonischen
// LCARS-Farbschemata (vgl. thelcars.com/colors.php): jede angemeldete Person
// kann in ihrem Profil (/user) ein Theme wählen, das dann als
// `data-theme`-Attribut auf <html> gesetzt wird (siehe src/app/layout.tsx) und
// die CSS-Variablen aus src/styles/tokens.css überschreibt (siehe
// src/styles/lcars-themes.css). Zusätzlich lässt sich jedes Theme
// individualisieren: einzelne Farb-Tokens können mit eigenen Farben
// überschrieben werden (theme_overrides), die per Inline-Style auf <html> über
// das Basis-Theme gelegt werden.
//
// WICHTIG: Die Theme-IDs hier müssen exakt den `html[data-theme="…"]`-Selektoren
// in src/styles/lcars-themes.css entsprechen; die `tokens`-Werte spiegeln die
// dortigen Akzent-Basiswerte (für Standard die :root-Werte aus tokens.css) und
// müssen mit ihnen synchron gehalten werden — sie liefern die Default-Anzeige
// der Farbwähler im Profil. Das Default-Theme "standard" braucht KEINEN eigenen
// CSS-Block (kein data-theme-Attribut).
//
// Bewusst OHNE "server-only": dieselbe Registry wird sowohl serverseitig
// (Layout, Server-Action) als auch clientseitig (Auswahl-Formular) importiert.

// Die individualisierbaren Akzent-Tokens (Rollennamen, siehe tokens.css). Die
// id ist zugleich das CSS-Variablen-Suffix: --lcars-<id> / --color-lcars-<id>.
export const THEME_TOKENS = [
  { id: "primary", label: "Primär" },
  { id: "primary-light", label: "Primär (hell)" },
  { id: "secondary", label: "Sekundär" },
  { id: "tertiary", label: "Tertiär" },
  { id: "quaternary", label: "Quartär" },
  { id: "quinary", label: "Quintär" },
  { id: "senary", label: "Senär" },
] as const;

export type TokenId = (typeof THEME_TOKENS)[number]["id"];

export const TOKEN_IDS: TokenId[] = THEME_TOKENS.map((t) => t.id);

export type ThemeTokens = Record<TokenId, string>;
// Nur die überschriebenen Tokens (Teilmenge) — leeres Objekt = keine
// Individualisierung.
export type ThemeOverrides = Partial<ThemeTokens>;

export interface ColorTheme {
  id: string;
  // Anzeigename im Profil-Formular.
  label: string;
  // Kurze Beschreibung (eine Zeile) für die Auswahl.
  description: string;
  // Akzent-Basiswerte des Themes (hex) — Default-Anzeige der Farbwähler und
  // Grundlage der kleinen Vorschau. Spiegeln src/styles/lcars-themes.css.
  tokens: ThemeTokens;
}

export const DEFAULT_THEME_ID = "standard";

// Namen der JS-lesbaren Theme-Cookies. Hier (nicht in session.ts) definiert,
// damit sowohl der Server (session.ts, layout.tsx) als auch der clientseitige
// ThemeApplier sie importieren können — session.ts ist "server-only".
export const THEME_COOKIE_NAME = "neo_theme";
export const THEME_CUSTOM_COOKIE_NAME = "neo_theme_custom";

// Reihenfolge = Anzeigereihenfolge im Formular. "standard" zuerst (Default).
export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Bernstein, Flieder & Blau — das gewohnte DS9/VOY-Interface.",
    tokens: {
      primary: "#ff9a00",
      "primary-light": "#ffcd9a",
      secondary: "#cd9acd",
      tertiary: "#9a9aff",
      quaternary: "#ff9a66",
      quinary: "#cd6666",
      senary: "#6bcb8b",
    },
  },
  {
    id: "classic",
    label: "Classic",
    description: "Warmes TNG-Gold mit Pfirsich, Hopbush & Anakiwa-Blau.",
    tokens: {
      primary: "#ff9900",
      "primary-light": "#ffcc66",
      secondary: "#cc6699",
      tertiary: "#99ccff",
      quaternary: "#ff9966",
      quinary: "#cc6666",
      senary: "#bbaa55",
    },
  },
  {
    id: "science",
    label: "Science",
    description: "Kühle Blautöne — Mariner, Melrose & Periwinkle.",
    tokens: {
      primary: "#99ccff",
      "primary-light": "#ccddff",
      secondary: "#9999ff",
      tertiary: "#5599ff",
      quaternary: "#6688cc",
      quinary: "#cc6699",
      senary: "#9999cc",
    },
  },
  {
    id: "nebula",
    label: "Nebula",
    description: "Violett & Magenta — Lilac, Hopbush & Cosmic.",
    tokens: {
      primary: "#cc99cc",
      "primary-light": "#e6c7e6",
      secondary: "#cc6699",
      tertiary: "#9999ff",
      quaternary: "#cc6666",
      quinary: "#774466",
      senary: "#9977aa",
    },
  },
  {
    id: "redalert",
    label: "Red Alert",
    description: "Rot- und Rosttöne — Red Damask, Rust & Bourbon.",
    tokens: {
      primary: "#ee5544",
      "primary-light": "#ee9955",
      secondary: "#dd6644",
      tertiary: "#ffcc66",
      quaternary: "#bb6622",
      quinary: "#bb4411",
      senary: "#cc6699",
    },
  },
  {
    id: "nemesis",
    label: "Nemesis",
    description: "Gedämpftes Stahlblau & Grau — Blue Bell & Lavender.",
    tokens: {
      primary: "#9999cc",
      "primary-light": "#c0c8e0",
      secondary: "#9977aa",
      tertiary: "#6688cc",
      quaternary: "#99ccff",
      quinary: "#cc6666",
      senary: "#8fa0c0",
    },
  },
];

export const THEME_IDS: string[] = COLOR_THEMES.map((t) => t.id);

export function isValidThemeId(id: string): boolean {
  return THEME_IDS.includes(id);
}

// Normalisiert einen beliebigen (ggf. veralteten/unbekannten) Wert auf eine
// gültige Theme-ID — fällt auf das Default-Theme zurück.
export function normalizeThemeId(id: string | null | undefined): string {
  return id && isValidThemeId(id) ? id : DEFAULT_THEME_ID;
}

export function getTheme(id: string): ColorTheme {
  return (
    COLOR_THEMES.find((t) => t.id === normalizeThemeId(id)) ?? COLOR_THEMES[0]
  );
}

// Repräsentative Vorschaufarben (primary/secondary/tertiary) eines Themes.
export function themeSwatch(theme: ColorTheme): [string, string, string] {
  return [theme.tokens.primary, theme.tokens.secondary, theme.tokens.tertiary];
}

// ─── Individualisierung / Overrides ────────────────────────────────────────

export function isValidTokenId(id: string): id is TokenId {
  return (TOKEN_IDS as string[]).includes(id);
}

const HEX_RE = /^#[0-9a-f]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value.toLowerCase());
}

// Normalisiert einen Hex-Farbwert auf Kleinschreibung mit führendem #; gibt
// null zurück, wenn er kein gültiges #rrggbb ist (kurze Formen wie #abc werden
// bewusst NICHT akzeptiert — die Farbwähler liefern immer die lange Form).
export function normalizeHexColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  return HEX_RE.test(v) ? v : null;
}

// Filtert ein beliebiges (ggf. aus Cookie/Client/DB stammendes) Objekt auf
// gültige Token→Hex-Paare herunter. Unbekannte Schlüssel und ungültige Farben
// werden verworfen — nie ungeprüft ins DOM/Style schreiben.
export function sanitizeThemeOverrides(raw: unknown): ThemeOverrides {
  if (!raw || typeof raw !== "object") return {};
  const out: ThemeOverrides = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidTokenId(key)) continue;
    if (typeof val !== "string") continue;
    const hex = normalizeHexColor(val);
    if (hex) out[key] = hex;
  }
  return out;
}

// Kompakte, cookie-sichere Serialisierung der Overrides:
// "primary:ff9900,secondary:cc6699" (ohne #). Leeres Objekt → "".
export function encodeThemeOverrides(overrides: ThemeOverrides): string {
  return Object.entries(overrides)
    .filter(([id, hex]) => isValidTokenId(id) && hex && isValidHexColor(hex))
    .map(([id, hex]) => `${id}:${hex.slice(1)}`)
    .join(",");
}

export function decodeThemeOverrides(encoded: string | null | undefined): ThemeOverrides {
  if (!encoded) return {};
  const out: ThemeOverrides = {};
  for (const pair of encoded.split(",")) {
    const [id, rawHex] = pair.split(":");
    if (!id || !rawHex) continue;
    if (!isValidTokenId(id)) continue;
    const hex = normalizeHexColor(`#${rawHex}`);
    if (hex) out[id] = hex;
  }
  return out;
}

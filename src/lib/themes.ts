// Farbthemes für die LCARS-Oberfläche. Angelehnt an die klassischen
// LCARS-Farbschemata (vgl. thelcars.com/colors.php): jede angemeldete Person
// kann in ihrem Profil (/user) ein Theme wählen, das dann serverseitig als
// `data-theme`-Attribut auf <html> gesetzt wird (siehe src/app/layout.tsx) und
// die CSS-Variablen aus src/styles/tokens.css überschreibt (siehe
// src/styles/lcars-themes.css).
//
// WICHTIG: Die Theme-IDs hier müssen exakt den `html[data-theme="…"]`-Selektoren
// in src/styles/lcars-themes.css entsprechen. Das Default-Theme "standard"
// entspricht den unveränderten :root-Werten und braucht daher KEINEN eigenen
// CSS-Block — es wird schlicht kein data-theme-Attribut gesetzt.
//
// Bewusst OHNE "server-only": dieselbe Registry wird sowohl serverseitig
// (Layout, Server-Action) als auch clientseitig (Auswahl-Formular) importiert.

export interface ColorTheme {
  id: string;
  // Anzeigename im Profil-Formular.
  label: string;
  // Kurze Beschreibung (eine Zeile) für die Auswahl.
  description: string;
  // Drei repräsentative Akzentfarben (hex) für die kleine Farbvorschau im
  // Formular — nur Dekoration, die echten Werte leben im CSS.
  swatch: [string, string, string];
}

export const DEFAULT_THEME_ID = "standard";

// Reihenfolge = Anzeigereihenfolge im Formular. "standard" zuerst (Default).
// Die Farben stammen aus der kanonischen LCARS-Palette (thelcars.com/colors.php,
// Namen/Hex identisch zum trekcolors-Datensatz) und sind bewusst stark
// unterschiedlich — nicht nur getönte Akzente, sondern eigene Hintergründe und
// Textfarben (siehe src/styles/lcars-themes.css). Der swatch zeigt
// primary/secondary/tertiary des jeweiligen Themes.
export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Bernstein, Flieder & Blau — das gewohnte DS9/VOY-Interface.",
    swatch: ["#ff9a00", "#cd9acd", "#9a9aff"],
  },
  {
    id: "classic",
    label: "Classic",
    description: "Warmes TNG-Gold mit Pfirsich, Hopbush & Anakiwa-Blau.",
    swatch: ["#ff9900", "#cc6699", "#99ccff"],
  },
  {
    id: "science",
    label: "Science",
    description: "Kühle Blautöne — Mariner, Melrose & Periwinkle.",
    swatch: ["#99ccff", "#9999ff", "#5599ff"],
  },
  {
    id: "nebula",
    label: "Nebula",
    description: "Violett & Magenta — Lilac, Hopbush & Cosmic.",
    swatch: ["#cc99cc", "#cc6699", "#9999ff"],
  },
  {
    id: "redalert",
    label: "Red Alert",
    description: "Rot- und Rosttöne — Red Damask, Rust & Bourbon.",
    swatch: ["#ee5544", "#dd6644", "#ffcc66"],
  },
  {
    id: "nemesis",
    label: "Nemesis",
    description: "Gedämpftes Stahlblau & Grau — Blue Bell & Lavender.",
    swatch: ["#9999cc", "#9977aa", "#6688cc"],
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

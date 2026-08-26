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
export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Violett & Blau — das klassische DS9/VOY-Interface.",
    swatch: ["#cd9acd", "#9a9aff", "#ff9a00"],
  },
  {
    id: "classic",
    label: "Classic",
    description: "Warmes TNG-Brückenpanel in Pfirsich, Gold & Flieder.",
    swatch: ["#ff9900", "#ffcc99", "#cc99cc"],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Gold- und Bernsteintöne der Betriebsabteilung.",
    swatch: ["#ffaa00", "#ffcc66", "#ff9933"],
  },
  {
    id: "science",
    label: "Science",
    description: "Kühles Blau & Teal der Wissenschaftsstation.",
    swatch: ["#6699ff", "#66e0cc", "#99ccff"],
  },
  {
    id: "command",
    label: "Command",
    description: "Rot & Orange der Kommandokonsole.",
    swatch: ["#ff5555", "#ff6644", "#ff9900"],
  },
  {
    id: "nemesis",
    label: "Nemesis",
    description: "Gedämpftes Stahlblau & Grau, kühl und nüchtern.",
    swatch: ["#8899cc", "#9fb8e0", "#d0a860"],
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

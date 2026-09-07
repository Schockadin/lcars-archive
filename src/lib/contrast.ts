// WCAG-Kontrastrechnung für die Farbwahl im Profil (/user → Darstellung).
//
// Hintergrund: Seit Hintergrund-, Schrift- und Akzentfarben frei wählbar sind,
// kann man sich die Oberfläche unlesbar einstellen (Schrift = Hintergrund).
// Diese Datei liefert die Zahlen, mit denen das Formular neben jedem Farbwähler
// den Kontrast anzeigt und zu blasse Kombinationen markiert.
//
// Bewusst React- und DB-frei, damit sie unit-testbar ist und sowohl im
// Client-Formular als auch (perspektivisch) serverseitig genutzt werden kann.
//
// Rechenweg nach WCAG 2.1 (relative Luminanz + Kontrastverhältnis):
//   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
//   https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

// "#rrggbb" → Kanäle 0–255. Gibt null für alles zurück, was kein langes Hex
// ist (die Farbwähler liefern immer die lange Form, siehe themes.ts).
export function parseHexColor(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHexColor({ r, g, b }: Rgb): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// Gamma-Korrektur eines einzelnen Kanals (0–255 → linear 0–1).
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  );
}

// Kontrastverhältnis zweier Farben: 1 (identisch) bis 21 (Schwarz auf Weiß).
// Ungültige Eingaben ergeben 1 — das Formular zeigt dann „zu blass" statt zu
// crashen.
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return 1;
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  const hi = Math.max(lf, lb);
  const lo = Math.min(lf, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// Schwellen nach WCAG 2.1 AA:
//   text        4.5:1  — Fließtext und kleine Beschriftungen
//   large       3.0:1  — große/fette Schrift (ab 18.66px fett bzw. 24px)
//   ui          3.0:1  — nicht-textliche Elemente wie Rahmen (1.4.11)
export type ContrastPurpose = "text" | "large" | "ui";

export const CONTRAST_THRESHOLDS: Record<ContrastPurpose, number> = {
  text: 4.5,
  large: 3,
  ui: 3,
};

export type ContrastLevel = "good" | "warn" | "fail";

// „good"  = erfüllt die Schwelle mit Reserve (AAA-nah bzw. deutlich darüber)
// „warn"  = erfüllt die Schwelle knapp
// „fail"  = unter der Schwelle
export function contrastLevel(
  ratio: number,
  purpose: ContrastPurpose = "text",
): ContrastLevel {
  const min = CONTRAST_THRESHOLDS[purpose];
  if (ratio < min) return "fail";
  // Reserve: eine Stufe über der Schwelle gilt als unbedenklich (7:1 ist die
  // AAA-Schwelle für Fließtext, 4.5:1 die für große Schrift).
  return ratio >= (purpose === "text" ? 7 : 4.5) ? "good" : "warn";
}

// Mischt eine Farbe anteilig mit Schwarz — dieselbe Rechnung wie
// color-mix(in srgb, C <pct>%, #000) in color-mode.css. Wird gebraucht, damit
// das Formular im Hellmodus den TATSÄCHLICH gerenderten (abgedunkelten)
// Akzent-Textwert bewertet und nicht den Rohwert.
export const LIGHT_ACCENT_INK_MIX = 45;

export function mixWithBlack(hex: string, percent: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  const f = Math.max(0, Math.min(100, percent)) / 100;
  return toHexColor({ r: rgb.r * f, g: rgb.g * f, b: rgb.b * f });
}

// Auf eine Nachkommastelle gerundet, wie im Formular angezeigt („4.7:1").
export function formatContrast(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

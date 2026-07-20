// Charakter-Farbe: eine pro User gewählte LCARS-Farbe, die die wörtliche Rede
// seiner Charaktere im Fließtext-Modus geschlossener Dialoge einfärbt (siehe
// DialogueFlowingText.tsx). Bewusst OHNE "server-only" — sowohl die Server-
// Auflösung (getDialogueMessages in dialoguesCore.ts) als auch die Client-
// Komponenten (Profil-Farbwähler, Fließtext-Rendering) nutzen dieselben
// Helfer.

// Die auswählbaren LCARS-Content-Farben (Reihenfolge = Anzeige im Farbwähler).
// Interface-Flächen (bg/surface/border) und Textfarben sind bewusst nicht
// dabei — nur die sechs kräftigen Akzentfarben aus tokens.css.
export const CHARACTER_COLOR_KEYS = [
  "amber",
  "blue",
  "green",
  "red",
  "purple",
  "orange",
] as const;

export type CharacterColorKey = (typeof CHARACTER_COLOR_KEYS)[number];

export const CHARACTER_COLOR_LABELS: Record<CharacterColorKey, string> = {
  amber: "Bernstein",
  blue: "Blau",
  green: "Grün",
  red: "Rot",
  purple: "Violett",
  orange: "Orange",
};

export function isCharacterColorKey(value: unknown): value is CharacterColorKey {
  return (
    typeof value === "string" &&
    (CHARACTER_COLOR_KEYS as readonly string[]).includes(value)
  );
}

// Auflösung der effektiven Farbe: eine explizit gewählte Farbe gewinnt, sonst
// wird deterministisch aus einem stabilen Wert (i.d.R. der User-ID) eine der
// LCARS-Farben abgeleitet — so hat jeder auch ohne eigene Wahl eine gültige
// Default-Farbe (Anforderung „default: eine der lcars-farben“), und
// verschiedene User bekommen meist verschiedene, ohne dass ein Backfill nötig
// wäre.
export function resolveCharacterColor(
  stored: string | null | undefined,
  seed: number,
): CharacterColorKey {
  if (isCharacterColorKey(stored)) return stored;
  const len = CHARACTER_COLOR_KEYS.length;
  const i = (((seed % len) + len) % len) || 0;
  return CHARACTER_COLOR_KEYS[i];
}

// CSS-Wert für eine Farbe — verweist auf die tokens.css-Custom-Property, damit
// Theme-Änderungen automatisch mitgezogen werden (kein fest verdrahteter Hex).
export function characterColorVar(key: CharacterColorKey): string {
  return `var(--lcars-${key})`;
}

// Öffnendes/schließendes deutsches Anführungszeichen (siehe remarkGermanQuotes
// in src/lib/markdown.ts, das gerade " zu „…" umwandelt).
const QUOTE_OPEN = "„"; // „
const QUOTE_CLOSE = "“"; // “

// Färbt die wörtliche Rede („…") in einem bereits gerenderten, sanitisierten
// HTML-Fragment mit der angegebenen Farbe ein. Bewusst simple String-
// Ersetzung auf den deutschen Anführungszeichen: die Quote-Zeichen stehen als
// Textzeichen im HTML, verschachtelte Zitate nutzen ‚einfache' Zeichen (kein
// „ innen), und ein <span> um evtl. enthaltenes Inline-Markup (z.B. einen
// Wikilink) ist valides HTML. colorVar stammt ausschließlich aus der festen
// Palette (characterColorVar), ist also kein user-kontrollierter Wert — keine
// Injection über das style-Attribut. inner ist bereits sanitisiertes HTML aus
// dem Nachrichten-content, es wird nichts Unsanitisiertes eingefügt.
export function colorizeDirectSpeech(html: string, colorVar: string): string {
  const re = new RegExp(
    `${QUOTE_OPEN}([^${QUOTE_OPEN}${QUOTE_CLOSE}]*)${QUOTE_CLOSE}`,
    "g",
  );
  return html.replace(
    re,
    (_m, inner) =>
      `${QUOTE_OPEN}<span style="color:${colorVar}">${inner}</span>${QUOTE_CLOSE}`,
  );
}

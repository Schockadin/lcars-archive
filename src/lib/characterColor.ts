// Charakter-Farbe: eine PRO CHARAKTER gewählte Farbe (nicht pro User — eine
// spielende Person mit mehreren Charakteren, "Multis", bekommt so für jeden
// Charakter eine eigene, unterscheidbare Farbe), die dessen wörtliche Rede im
// Fließtext-Modus geschlossener Dialoge sowie die Nachrichten-Karten in
// offenen wie geschlossenen Dialogen einfärbt (siehe DialogueFlowingText.tsx,
// DialogueThread.tsx). Gespeichert als Hex-Farbe (#rrggbb) auf
// characters.character_color — neben den LCARS-Presets ist auch eine frei per
// Color-Picker gewählte Farbe möglich. Bewusst OHNE "server-only" — sowohl die
// Server-Auflösung (getDialogueMessages in dialoguesCore.ts) als auch die
// Client-Komponenten (Farbwähler im Profil, Fließtext-/Karten-Rendering)
// nutzen dieselben Helfer.

// LCARS-Preset-Farben (Hex aus src/styles/tokens.css) — Vorauswahl im
// Farbwähler. Reihenfolge = Anzeige. `key` dient nur der stabilen React-Key-
// Vergabe/Deterministik, gespeichert wird immer der Hex-Wert.
export const LCARS_COLOR_PRESETS = [
  { key: "amber", label: "Bernstein", hex: "#ff9a00" },
  { key: "blue", label: "Blau", hex: "#9a9aff" },
  { key: "green", label: "Grün", hex: "#6bcb8b" },
  { key: "red", label: "Rot", hex: "#cd6666" },
  { key: "purple", label: "Violett", hex: "#cd9acd" },
  { key: "orange", label: "Orange", hex: "#ff9a66" },
] as const;

export const PRESET_HEXES: readonly string[] = LCARS_COLOR_PRESETS.map(
  (p) => p.hex,
);

// Farbe ALLER NPCs in Gesprächen: ein helles Grau. NPCs bekamen bisher — wie
// Charaktere — eine der Preset-Farben aus ihrer ID abgeleitet und standen
// damit optisch gleichwertig neben den Spielercharakteren. Ein einheitliches,
// zurückhaltendes Grau trennt beide Gruppen auf einen Blick: bunt ist, wer
// von einer Spielerin/einem Spieler geführt wird.
export const NPC_COLOR = "#c9c9d4";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

// Kleinschreibung für konsistente Vergleiche/Eindeutigkeit (die „in
// Benutzung"-Sperre und der partielle UNIQUE-Index vergleichen exakt).
export function normalizeHex(hex: string): string {
  return hex.toLowerCase();
}

// Effektive Farbe: ein explizit gewählter, gültiger Hex gewinnt, sonst wird
// deterministisch eine der LCARS-Preset-Farben aus einem stabilen Wert
// (der Charakter-ID) abgeleitet — so hat jeder Charakter auch ohne eigene Wahl
// eine gültige Default-Farbe („default: eine der lcars-farben"), und
// verschiedene Charaktere bekommen meist verschiedene. Liefert immer einen
// gültigen Hex.
export function resolveCharacterColor(
  stored: string | null | undefined,
  seed: number,
): string {
  if (isHexColor(stored)) return normalizeHex(stored);
  const len = PRESET_HEXES.length;
  const i = ((seed % len) + len) % len || 0;
  return PRESET_HEXES[i];
}

// Wie resolveCharacterColor, aber für die Vorauswahl im Farbwähler im Profil
// (eine Instanz pro Charakter): überspringt bei abgeleitetem Default bereits
// von ANDEREN Charakteren belegte Preset-Farben, damit der vorgeschlagene
// Default auch speicherbar ist (nicht schon gesperrt). Belegte Farben kommen
// aus getUsedCharacterColorsWithIds, je Charakter gefiltert durch
// takenColorsForCharacter. Sind alle Presets belegt, fällt es auf den
// einfachen deterministischen Wert zurück.
export function resolveCharacterDefaultColor(
  stored: string | null | undefined,
  seed: number,
  taken: ReadonlySet<string>,
): string {
  if (isHexColor(stored)) return normalizeHex(stored);
  const len = PRESET_HEXES.length;
  for (let k = 0; k < len; k++) {
    const idx = (((seed + k) % len) + len) % len;
    const hex = PRESET_HEXES[idx];
    if (!taken.has(hex)) return hex;
  }
  return resolveCharacterColor(stored, seed);
}

// Die für EINEN Charakter gesperrten Farben aus der Gesamtliste aller
// belegten Farben (getUsedCharacterColorsWithIds) — also alle außer seiner
// eigenen. Der partielle UNIQUE-Index macht jede Farbe global exklusiv, auch
// zwischen den Charakteren desselben Users; ausgeschlossen wird deshalb
// ausschließlich der Charakter selbst, nicht etwa seine „Geschwister".
//
// Steht bewusst hier als reine Funktion statt inline in src/app/user/page.tsx:
// die Auswahl lief früher pro Charakter über eine eigene SQL-Abfrage
// (WHERE id != …) und wird jetzt in JS aus einer einzigen Abfrage abgeleitet
// — genau die Art Umbau, bei dem ein vergessener Selbst-Ausschluss unbemerkt
// bliebe, weil er nur eine Farbe zu viel sperrt.
export function takenColorsForCharacter(
  characterId: number,
  usedColors: readonly { id: number; color: string }[],
): string[] {
  return usedColors
    .filter((u) => u.id !== characterId)
    .map((u) => normalizeHex(u.color));
}

// Öffnendes/schließendes deutsches Anführungszeichen (siehe remarkGermanQuotes
// in src/lib/markdown.ts, das gerade " zu „…" umwandelt).
const QUOTE_OPEN = "„"; // „
const QUOTE_CLOSE = "“"; // “

// Färbt die wörtliche Rede („…") in einem bereits gerenderten, sanitisierten
// HTML-Fragment mit der angegebenen Farbe ein — INKLUSIVE der Anführungs-
// zeichen selbst (die gehören zur wörtlichen Rede und werden mit eingefärbt).
// Bewusst simple String-Ersetzung auf den deutschen Anführungszeichen: die
// Quote-Zeichen stehen als Textzeichen im HTML, verschachtelte Zitate nutzen
// ‚einfache' Zeichen (kein „ innen), und ein <span> um evtl. enthaltenes
// Inline-Markup (z.B. einen Wikilink) ist valides HTML. color stammt aus einem
// validierten Hex (resolveCharacterColor), ist also kein user-freier Wert im
// style-Attribut — keine Injection. inner ist bereits sanitisiertes HTML aus
// dem Nachrichten-content.
export function colorizeDirectSpeech(html: string, color: string): string {
  const re = new RegExp(
    `${QUOTE_OPEN}([^${QUOTE_OPEN}${QUOTE_CLOSE}]*)${QUOTE_CLOSE}`,
    "g",
  );
  return html.replace(
    re,
    (_m, inner) =>
      `<span style="color:${color}">${QUOTE_OPEN}${inner}${QUOTE_CLOSE}</span>`,
  );
}

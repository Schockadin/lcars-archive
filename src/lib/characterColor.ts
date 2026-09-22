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

// Tags, an deren Grenze eine Einfärbung enden MUSS: Ein <span> darf keinen
// Blockwechsel überspannen. Inline-Tags (a, em, strong, code, br …) stehen
// bewusst NICHT hier — die dürfen innerhalb der Rede vorkommen und bleiben
// mit eingefärbt.
const BLOCK_TAGS = new Set([
  "p", "div", "section", "article", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "blockquote", "pre", "hr",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th",
]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

// Färbt die wörtliche Rede („…") in einem bereits gerenderten, sanitisierten
// HTML-Fragment mit der angegebenen Farbe ein — INKLUSIVE der Anführungs-
// zeichen selbst (die gehören zur wörtlichen Rede und werden mit eingefärbt).
//
// Läuft über die Zeichen statt über einen Regex auf „…“, weil eine Rede sich
// über MEHRERE ABSÄTZE erstrecken darf:
//
//   <p>„Lorem ipsum</p><p>dolor amit“</p>
//
// Ein einzelnes <span> von „ bis “ überspannte hier die Absatzgrenze; der
// Browser repariert das, indem er den span am </p> schließt — gefärbt war
// dann nur der erste Absatz. Stattdessen wird je Block EIN eigener span
// geöffnet und am Blockende wieder geschlossen, während der Zustand „Rede
// läuft" über die Grenze hinweg erhalten bleibt. Ergebnis: valides HTML, und
// jeder Absatz der Rede trägt die Farbe.
//
// Der span wird faul geöffnet (erst vor dem ersten nicht-leeren Zeichen),
// damit zwischen zwei Blöcken kein leerer span im Zwischenraum landet.
//
// Bleibt ein „ ohne Gegenstück, färbt die Rede bis zum Ende des Fragments —
// dieselbe Regel wie über Absätze hinweg, nur ohne Ende. Das Fragment ist je
// Nachricht eines (siehe DialogueFlowingText), der Schaden eines Tippfehlers
// bleibt also auf sie begrenzt.
//
// Tags werden übersprungen statt mitgelesen: Ein „ in einem Attributwert ist
// kein Redeanfang.
//
// color stammt aus einem validierten Hex (resolveCharacterColor), ist also
// kein user-freier Wert im style-Attribut — keine Injection. Der Text ist
// bereits sanitisiertes HTML aus dem Nachrichten-content.
export function colorizeDirectSpeech(html: string, color: string): string {
  if (!html.includes(QUOTE_OPEN)) return html;

  const spanOpenTag = `<span style="color:${color}">`;
  let out = "";
  // Läuft die Rede gerade? Gilt über Blockgrenzen hinweg.
  let speaking = false;
  // Steht im Ausgabetext gerade ein <span> offen?
  let spanOpen = false;

  function openSpan(): void {
    if (!spanOpen) {
      out += spanOpenTag;
      spanOpen = true;
    }
  }
  function closeSpan(): void {
    if (spanOpen) {
      out += "</span>";
      spanOpen = false;
    }
  }

  function emitText(text: string): void {
    for (const ch of text) {
      if (ch === QUOTE_OPEN) {
        speaking = true;
        openSpan();
        out += ch;
      } else if (ch === QUOTE_CLOSE && speaking) {
        openSpan();
        out += ch;
        closeSpan();
        speaking = false;
      } else {
        // Reiner Leerraum öffnet keinen span — sonst stünde zwischen zwei
        // Absätzen einer um den bloßen Zeilenumbruch.
        if (speaking && ch.trim() !== "") openSpan();
        out += ch;
      }
    }
  }

  let last = 0;
  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(html))) {
    emitText(html.slice(last, match.index));
    if (BLOCK_TAGS.has(match[1].toLowerCase())) closeSpan();
    out += match[0];
    last = match.index + match[0].length;
  }
  emitText(html.slice(last));
  closeSpan();

  return out;
}

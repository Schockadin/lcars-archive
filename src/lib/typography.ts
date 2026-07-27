// Typografische Korrektur deutscher Texte — reine, testbare Logik (keine
// Abhängigkeit auf DB/Remark), damit sie sowohl in der Render-Pipeline
// (src/lib/markdown.ts) als auch im Bulk-Skript (/admin/scripts) und in Tests
// nutzbar ist.

// Deutsche typografische Anführungszeichen: „unten am Anfang", „oben am Ende".
export const GERMAN_QUOTE_OPEN = "„"; // „
export const GERMAN_QUOTE_CLOSE = "“"; // “

// Entscheidet KONTEXTBASIERT (nicht paritätsbasiert), ob ein gerades " ein
// ÖFFNENDES Anführungszeichen ist: nur wenn davor nichts „Wort-artiges" steht
// (Zeilen-/Textanfang, Leerraum, öffnende Klammer, Gedanken-/Bindestrich,
// bereits gesetztes öffnendes Anführungszeichen). Sonst schließt es.
//
// Warum kontextbasiert statt „öffnend/schließend abwechselnd hochzählen": Das
// alte Verfahren verschob sich bei jedem unpaarigen " (z.B. Zoll-Angabe) und
// vor allem bei wörtlicher Rede über MEHRERE Absätze — ein Folgeabsatz, der die
// Rede nur abschließt (…Ende."), begann die Zählung neu bei „öffnend" und
// erzeugte so unten stehende Schluss-Anführungszeichen. Der Kontext des
// Vorzeichens ist dagegen robust und absatzunabhängig.
export function opensQuote(prevChar: string | undefined | null): boolean {
  if (prevChar == null || prevChar === "") return true;
  // Leerraum, öffnende Klammern/Winkel, Gedanken-/Halbgeviertstrich, öffnende
  // typografische Anführungszeichen (deutsch/frz.) und geschütztes Leerzeichen.
  return /[\s(\[{<–—„‚« ]/u.test(prevChar);
}

// Bereiche, die NICHT angetastet werden: Code-Fences (``` / ~~~), Inline-Code,
// Bilder, Wikilinks und Markdown-Links (deren URL). Innerhalb dieser bleibt ein
// gerades " unverändert (z.B. Attribut-Werte, Pfade).
const PROTECTED_RE =
  /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|!\[[^\]]*\]\([^)]*\)|\[\[[^\]]*\]\]|\[[^\]]*\]\([^)]*\)/g;

// Wandelt gerade Anführungszeichen (") in einem Markdown-String in deutsche
// typografische um. Idempotent (bereits gesetzte „ " bleiben unberührt), lässt
// Code/Links unangetastet. Wird vom Bulk-Skript genutzt, um den gespeicherten
// Quelltext (source_md) dauerhaft zu korrigieren.
export function applyGermanTypography(input: string): string {
  if (!input.includes('"')) return input;

  const protectedRanges: [number, number][] = [];
  PROTECTED_RE.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = PROTECTED_RE.exec(input))) {
    protectedRanges.push([pm.index, pm.index + pm[0].length]);
  }
  const isProtected = (i: number) =>
    protectedRanges.some(([s, e]) => i >= s && i < e);

  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"' && !isProtected(i)) {
      out += opensQuote(input[i - 1]) ? GERMAN_QUOTE_OPEN : GERMAN_QUOTE_CLOSE;
    } else {
      out += ch;
    }
  }
  return out;
}

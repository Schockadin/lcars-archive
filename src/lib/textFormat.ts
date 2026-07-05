export interface TextFormatResult {
  sourceMd: string;
  apostropheCount: number;
  quoteCount: number;
}

// Codeblöcke/Inline-Code/Bilder sowie bestehende Links/Wikilinks bleiben
// unangetastet — anders als bei applyAutolinks() (src/lib/autolink.ts) wird
// hier auch der sichtbare Linktext/Alias NICHT mitkorrigiert, um jedes
// Risiko einer beschädigten Link-Syntax auszuschließen (bewusst
// konservativer als technisch nötig).
const PROTECTED_RE =
  /```[\s\S]*?```|`[^`\n]*`|!\[[^\]]*\]\([^)]*\)|\[\[[^\]]*\]\]|\[[^\]]*\]\([^)]*\)/g;

function findProtectedRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  PROTECTED_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PROTECTED_RE.exec(text))) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

// Wendet transform() nur auf die Abschnitte zwischen den geschützten
// Bereichen an und fügt den Rest unverändert wieder zusammen.
function transformUnprotected(
  text: string,
  ranges: [number, number][],
  transform: (segment: string) => string,
): string {
  const parts: string[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    parts.push(transform(text.slice(last, start)));
    parts.push(text.slice(start, end));
    last = end;
  }
  parts.push(transform(text.slice(last)));
  return parts.join("");
}

function straightenApostrophes(segment: string): string {
  return segment.replace(/'/g, "’");
}

// Alternierend öffnend/schließend, zurückgesetzt je Absatz (Leerzeile) —
// dieselbe Regel wie remarkGermanQuotes() in lib/markdown.ts (Duden-
// Empfehlung: „unten am Anfang, oben am Ende"), hier aber auf dem rohen
// Markdown-Text statt dem mdast-Baum: der Admin-Formatieren-Button soll den
// bestehenden Quelltext so wenig wie möglich verändern — ein mdast-
// Roundtrip über remark-stringify würde auch unabhängige Formatierung
// (Listen-/Emphase-Stil, Zeilenumbrüche) anfassen, die hier nicht gemeint
// ist.
function germanizeQuotes(segment: string): string {
  return segment
    .split(/(\n\s*\n)/)
    .map((chunk) => {
      if (/^\n\s*\n$/.test(chunk)) return chunk;
      let open = true;
      return chunk.replace(/"/g, () => {
        const mark = open ? "„" : "“";
        open = !open;
        return mark;
      });
    })
    .join("");
}

function countChar(text: string, char: string): number {
  let count = 0;
  for (const c of text) if (c === char) count++;
  return count;
}

// Vereinheitlicht die Typografie eines Markdown-Quelltexts: gerade
// Apostrophe (') werden zum typografischen Apostroph ('), gerade doppelte
// Anführungszeichen (") zu deutschen Anführungszeichen („…"). Codeblöcke,
// Inline-Code, Bilder und bestehende Links/Wikilinks bleiben unangetastet.
export function formatContentText(sourceMd: string): TextFormatResult {
  const ranges = findProtectedRanges(sourceMd);
  let apostropheCount = 0;
  let quoteCount = 0;

  const formatted = transformUnprotected(sourceMd, ranges, (segment) => {
    apostropheCount += countChar(segment, "'");
    quoteCount += countChar(segment, '"');
    return germanizeQuotes(straightenApostrophes(segment));
  });

  return { sourceMd: formatted, apostropheCount, quoteCount };
}

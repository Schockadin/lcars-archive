// Markdown für den PDF-Export in einfache Blöcke zerlegen.
//
// @react-pdf kennt kein HTML: die gerenderte Biografie der Charakterseite
// lässt sich also nicht einfach hineinreichen. Für ein Blatt zum Ausdrucken
// genügt aber, was Markdown an Struktur hergibt — Überschriften, Absätze,
// Aufzählungen und Zitate, und darin Fett und Kursiv.
//
// Bewusst KEINE zweite Markdown-Pipeline: remark im PDF-Pfad zu betreiben
// hieße, dessen HTML anschließend wieder in react-pdf-Knoten zu übersetzen.
// Für ein Textblatt ist das mehr Maschinerie, als der Zweck trägt.

export type PdfBlockKind = "heading" | "paragraph" | "listItem" | "quote";

// Ein Stück Text mit seiner Auszeichnung. @react-pdf kennt kein <strong>,
// wohl aber verschachtelte <Text> mit eigener Schriftfamilie — ein Absatz ist
// deshalb eine Folge solcher Stücke statt einer Zeichenkette.
export interface PdfSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  // Inline-Code: eigene Schrift, damit `foo` als Code erkennbar bleibt.
  code?: boolean;
}

export interface PdfBlock {
  kind: PdfBlockKind;
  // Der reine Text des Blocks — für alles, was keine Auszeichnung darstellen
  // kann (Lesezeichen, Kürzungen, Vergleiche).
  text: string;
  spans: PdfSpan[];
}

// Was keine Auszeichnung ist, sondern nur Verweis-Syntax: auf den sichtbaren
// Text zurückführen, bevor die Betonungen gelesen werden.
function stripLinks(text: string): string {
  return (
    text
      // Bilder zuerst: ![alt](url) → alt (sonst bliebe das führende „!“).
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Links: [Text](url) → Text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Wiki-Links: [[Ziel|Text]] bzw. [[Ziel]]
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      // Durchgestrichenes kann das PDF nicht zeigen — der Text bleibt.
      .replace(/~~(.*?)~~/g, "$1")
  );
}

// Betonungen in Stücke zerlegen. Bewusst ein kleiner Scanner statt einer
// Kette von Ersetzungen: nur so lässt sich sagen, WELCHER Teil fett ist,
// statt die Sternchen bloß wegzuwerfen.
//
// Erkannt wird ***fett kursiv***, **fett**, __fett__, *kursiv*, _kursiv_ und
// `Code`. Was keinen Partner findet, bleibt als Zeichen stehen — ein einzelner
// Stern im Fließtext ist ein Stern und kein halber Kursivbereich.
export function toSpans(text: string): PdfSpan[] {
  const source = stripLinks(text);
  const spans: PdfSpan[] = [];
  let plain = "";
  let bold = false;
  let italic = false;

  const flush = () => {
    if (!plain) return;
    const span: PdfSpan = { text: plain };
    if (bold) span.bold = true;
    if (italic) span.italic = true;
    spans.push(span);
    plain = "";
  };

  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);

    // Code endet immer am nächsten Backtick; alles dazwischen bleibt roh.
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      spans.push({ text: code[1], code: true });
      i += code[0].length;
      continue;
    }

    const marker = /^(\*\*\*|___|\*\*|__|\*|_)/.exec(rest);
    if (marker) {
      const token = marker[1];
      const both = token.length === 3;
      const strong = token.length === 2;

      // Schließt der Marker einen offenen Bereich, gilt er immer — ein
      // Abschluss braucht keinen eigenen Partner mehr.
      const closing = both ? bold && italic : strong ? bold : italic;
      // Sonst öffnet er nur, wenn weiter hinten wirklich ein Abschluss folgt
      // UND direkt Text kommt: „2 * 3 = 6 * 7“ ist Rechnen, keine Kursive.
      const nextChar = source[i + token.length] ?? "";
      const opening =
        !closing &&
        nextChar !== "" &&
        !/\s/.test(nextChar) &&
        source.indexOf(token, i + token.length) !== -1;

      if (closing || opening) {
        flush();
        if (both) {
          bold = !bold;
          italic = !italic;
        } else if (strong) {
          bold = !bold;
        } else {
          italic = !italic;
        }
        i += token.length;
        continue;
      }
    }

    plain += source[i];
    i += 1;
  }
  flush();
  return spans;
}

function makeBlock(kind: PdfBlockKind, raw: string): PdfBlock | null {
  const spans = toSpans(raw).filter((span) => span.text !== "");
  const text = spans.map((span) => span.text).join("").trim();
  if (!text) return null;
  // Führende/abschließende Leerzeichen der Randstücke wegnehmen, damit ein
  // Block nicht mit einem Leerzeichen beginnt.
  if (spans.length > 0) {
    spans[0] = { ...spans[0], text: spans[0].text.replace(/^\s+/, "") };
    const last = spans.length - 1;
    spans[last] = { ...spans[last], text: spans[last].text.replace(/\s+$/, "") };
  }
  return { kind, text, spans: spans.filter((span) => span.text !== "") };
}

// HTML-Kommentare fallen VOR allem anderen weg — sie stehen nicht im
// gerenderten Text und haben deshalb auch im PDF nichts verloren. Wichtigster
// Fall: die <!-- timeline: … -->-Marken, die in fast jedem Bericht stecken
// (siehe src/lib/timelineTypes.ts). Sie dürfen über mehrere Zeilen gehen.
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

export function toPdfBlocks(markdown: string): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  // Absätze sind durch Leerzeilen getrennt; innerhalb eines Absatzes ist ein
  // Zeilenumbruch in Markdown keiner.
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const block = makeBlock("paragraph", paragraph.join(" "));
    if (block) blocks.push(block);
    paragraph = [];
  }

  let inFence = false;
  for (const rawLine of markdown.replace(HTML_COMMENT_RE, "").split(/\r?\n/)) {
    const line = rawLine.trim();

    // Codeblöcke unverändert als Absätze übernehmen — ihre Zeilen sind
    // bedeutungstragend, die Zäune selbst nicht.
    if (line.startsWith("```")) {
      flushParagraph();
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      // Zeilen im Codeblock bleiben roh: dort ist ein Sternchen ein
      // Sternchen und keine Auszeichnung.
      if (line) {
        blocks.push({
          kind: "paragraph",
          text: rawLine,
          spans: [{ text: rawLine, code: true }],
        });
      }
      continue;
    }

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const block = makeBlock("heading", heading[1]);
      if (block) blocks.push(block);
      continue;
    }

    // Trennlinien tragen im PDF nichts bei.
    if (/^([-*_])\s*(\1\s*){2,}$/.test(line)) {
      flushParagraph();
      continue;
    }

    const listItem = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (listItem) {
      flushParagraph();
      const block = makeBlock("listItem", listItem[1]);
      if (block) blocks.push(block);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      const block = makeBlock("quote", quote[1]);
      if (block) blocks.push(block);
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();

  return blocks;
}

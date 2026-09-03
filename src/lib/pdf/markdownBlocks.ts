// Markdown für den PDF-Export in einfache Blöcke zerlegen.
//
// @react-pdf kennt kein HTML: die gerenderte Biografie der Charakterseite
// lässt sich also nicht einfach hineinreichen. Für ein Blatt zum Ausdrucken
// genügt aber, was Markdown an Struktur hergibt — Überschriften, Absätze,
// Aufzählungen und Zitate. Alles Weitere (Links, Betonungen, Bilder) wird auf
// seinen Text zurückgeführt, statt Auszeichnungszeichen mitzudrucken.
//
// Bewusst KEINE zweite Markdown-Pipeline: remark im PDF-Pfad zu betreiben
// hieße, dessen HTML anschließend wieder in react-pdf-Knoten zu übersetzen.
// Für ein Textblatt ist das mehr Maschinerie, als der Zweck trägt.

export type PdfBlockKind = "heading" | "paragraph" | "listItem" | "quote";

export interface PdfBlock {
  kind: PdfBlockKind;
  text: string;
}

// Inline-Auszeichnungen auf ihren Text zurückführen.
function stripInline(text: string): string {
  return (
    text
      // Bilder zuerst: ![alt](url) → alt (sonst bliebe das führende „!“).
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Links: [Text](url) → Text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Wiki-Links: [[Ziel|Text]] bzw. [[Ziel]]
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      // Fett/kursiv/durchgestrichen/Code
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .trim()
  );
}

export function toPdfBlocks(markdown: string): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  // Absätze sind durch Leerzeilen getrennt; innerhalb eines Absatzes ist ein
  // Zeilenumbruch in Markdown keiner.
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const text = stripInline(paragraph.join(" "));
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  }

  let inFence = false;
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    // Codeblöcke unverändert als Absätze übernehmen — ihre Zeilen sind
    // bedeutungstragend, die Zäune selbst nicht.
    if (line.startsWith("```")) {
      flushParagraph();
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      if (line) blocks.push({ kind: "paragraph", text: rawLine });
      continue;
    }

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const text = stripInline(heading[1]);
      if (text) blocks.push({ kind: "heading", text });
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
      const text = stripInline(listItem[1]);
      if (text) blocks.push({ kind: "listItem", text });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      const text = stripInline(quote[1]);
      if (text) blocks.push({ kind: "quote", text });
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();

  return blocks;
}

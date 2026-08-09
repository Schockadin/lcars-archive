"use client";
import { Fragment, type ReactNode } from "react";

// Leichtgewichtiger Markdown-Renderer für die gestreamten Antworten des
// Archiv-Assistenten. Bewusst OHNE zusätzliche Abhängigkeit (kein
// react-markdown) und OHNE dangerouslySetInnerHTML: es werden ausschließlich
// React-Elemente erzeugt, der Text landet immer als React-Textknoten (der von
// React escaped wird) — damit ist die Ausgabe XSS-sicher, auch wenn das LLM
// mal HTML/Script-artiges liefert. Deckt die Konstrukte ab, die ein
// Chat-Antworttext üblicherweise nutzt: Überschriften, Absätze, Fett/Kursiv,
// Inline-Code, Codeblöcke, Listen (nummeriert/ungeordnet), Zitate, Links.
// Unvollständiges Markdown während des Streamings (z.B. ein noch nicht
// geschlossenes **) wird einfach als Text dargestellt, bis das schließende
// Zeichen nachkommt.

// Nur ungefährliche URL-Schemata zulassen (sonst Link als Text ausgeben) —
// verhindert javascript:/data:-URLs.
function safeUrl(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (u.startsWith("/") || u.startsWith("#")) return u;
  return null;
}

function renderLink(label: string, url: string): ReactNode {
  const safe = safeUrl(url);
  if (!safe) return `[${label}](${url})`;
  const internal = safe.startsWith("/") || safe.startsWith("#");
  return (
    <a
      href={safe}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
    >
      {parseInline(label)}
    </a>
  );
}

// Inline-Formatierung: findet je Schritt das früheste Sonderzeichen-Muster und
// rendert es; Reihenfolge im Array = Priorität bei Gleichstand (Code vor Link
// vor Fett vor Kursiv), damit z.B. `**` als Fett und nicht als zweifaches
// Kursiv interpretiert wird.
function parseInline(text: string): ReactNode[] {
  const patterns: {
    re: RegExp;
    render: (m: RegExpExecArray) => ReactNode;
  }[] = [
    { re: /`([^`]+)`/, render: (m) => <code>{m[1]}</code> },
    { re: /\[([^\]]+)\]\(([^)\s]+)\)/, render: (m) => renderLink(m[1], m[2]) },
    { re: /\*\*([\s\S]+?)\*\*/, render: (m) => <strong>{parseInline(m[1])}</strong> },
    { re: /\*([\s\S]+?)\*/, render: (m) => <em>{parseInline(m[1])}</em> },
  ];

  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;
  const push = (node: ReactNode) => out.push(<Fragment key={key++}>{node}</Fragment>);

  while (rest.length > 0) {
    let best: { index: number; length: number; node: ReactNode } | null = null;
    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, length: m[0].length, node: p.render(m) };
      }
    }
    if (!best) {
      push(rest);
      break;
    }
    if (best.index > 0) push(rest.slice(0, best.index));
    push(best.node);
    rest = rest.slice(best.index + best.length);
  }
  return out;
}

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

// Startet eine Zeile ein Block-Konstrukt (Codezaun/Überschrift/Zitat/Liste)?
// — Abbruchkriterium für die Absatz-Sammlung.
const BLOCK_START_RE = /^\s*(```|#{1,6}\s|>\s?|[-*+]\s|\d+\.\s)/;

function parseBlocks(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Codeblock ``` … ```
    if (/^\s*```/.test(line)) {
      i++;
      const code: string[] = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // schließende ```
      blocks.push(
        <pre key={key++}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Leerzeile
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Überschrift
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = `h${heading[1].length}` as HeadingTag;
      blocks.push(<Tag key={key++}>{parseInline(heading[2].trim())}</Tag>);
      i++;
      continue;
    }

    // Horizontale Linie
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={key++} />);
      i++;
      continue;
    }

    // Zitat
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key++}>{parseInline(quote.join(" "))}</blockquote>,
      );
      continue;
    }

    // Ungeordnete Liste
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>{parseInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Nummerierte Liste
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++}>
          {items.map((it, j) => (
            <li key={j}>{parseInline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Absatz: bis Leerzeile oder Beginn eines Block-Konstrukts sammeln.
    const para: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !BLOCK_START_RE.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{parseInline(para.join(" "))}</p>);
  }

  return blocks;
}

export default function MarkdownLite({ text }: { text: string }) {
  return <>{parseBlocks(text)}</>;
}

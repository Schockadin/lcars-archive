// src/lib/markdown.ts
// Markdown → HTML Pipeline, gemeinsam genutzt von Ingest-Skripten und App-Code.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root as MdastRoot, Parent as MdastParent, Text as MdastText, Link as MdastLink } from "mdast";

// Obsidian-artige [[Ziel]] / [[Ziel|Anzeigetext]] / [[Ziel#Abschnitt|Text]]
// Verweise. Der Abschnitt (#...) wird beim Auflösen aktuell ignoriert, nur
// der Ziel-Titel zählt. Wird als Link mit Sonder-Schema "wikilink://<Ziel>"
// codiert – erst die Ingest-Nachbearbeitung (scripts/ingest/wikilinks.ts)
// löst das anhand aller Titel/Namen in der DB zum echten href auf, weil zum
// Zeitpunkt der Markdown→HTML-Konvertierung einzelner Dateien noch nicht
// bekannt ist, worauf der Verweis zeigt.
export const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

function remarkWikiLinks() {
  return (tree: MdastRoot) => {
    visit(tree, "text", (node: MdastText, index, parent: MdastParent | null | undefined) => {
      if (!parent || index == null) return;
      WIKILINK_RE.lastIndex = 0;
      if (!WIKILINK_RE.test(node.value)) return;
      WIKILINK_RE.lastIndex = 0;

      const value = node.value;
      const newNodes: (MdastText | MdastLink)[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = WIKILINK_RE.exec(value))) {
        const [full, target, alias] = match;
        if (match.index > lastIndex) {
          newNodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
        }
        const label = (alias ?? target).trim();
        newNodes.push({
          type: "link",
          url: `wikilink://${encodeURIComponent(target.trim())}`,
          children: [{ type: "text", value: label }],
        });
        lastIndex = match.index + full.length;
      }
      if (lastIndex < value.length) {
        newNodes.push({ type: "text", value: value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length;
    });
  };
}

// Markdown bis zum private-Kommentar kürzen und zu HTML konvertieren
export async function markdownToHtml(markdown: string): Promise<string> {
  const publicContent = markdown.split("<!-- private -->")[0].trim();

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLinks)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(publicContent);

  return result.toString();
}

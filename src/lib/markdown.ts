// src/lib/markdown.ts
// Markdown → HTML Pipeline, gemeinsam genutzt von Ingest-Skripten und App-Code.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type {
  Root as MdastRoot,
  Parent as MdastParent,
  Text as MdastText,
  Link as MdastLink,
  Html as MdastHtml,
} from "mdast";
import type { Handlers as MdastToHastHandlers } from "mdast-util-to-hast";

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

// <!-- timeline: ... -->-Marker. Geteilt mit scripts/ingest/timeline.ts, damit
// Ingest (Ereignis-Reihenfolge dort) und Renderer (Sprungmarken-Reihenfolge
// hier) beim Durchzählen der Marker in einer Datei niemals auseinanderlaufen.
export const TIMELINE_MARKER_RE = /<!--\s*timeline\s*:(.*?)-->/gs;

interface TimelineAnchorNode {
  type: "timelineAnchor";
  anchorId: string;
}

// Ersetzt jeden <!-- timeline: ... -->-Kommentar durch eine unsichtbare
// Sprungmarke (<span id="timeline-N">) an genau der Stelle im gerenderten
// HTML, an der der Kommentar im Markdown steht — so kann die Timeline-Seite
// per Anker direkt dorthin verlinken. Die Nummerierung folgt der
// Dokumentreihenfolge (1-basiert, jeder Marker zählt, auch ungültige) und
// muss 1:1 mit parseTimelineMarkers() in scripts/ingest/timeline.ts
// übereinstimmen, das dieselbe RegExp in derselben Reihenfolge über denselben
// splitPrivate()-Text auswertet.
function remarkTimelineAnchors() {
  return (tree: MdastRoot) => {
    let counter = 0;
    visit(tree, "html", (node: MdastHtml, index, parent: MdastParent | null | undefined) => {
      if (!parent || index == null) return;
      const matches = node.value.match(TIMELINE_MARKER_RE);
      if (!matches) return;

      const anchors = matches.map((): TimelineAnchorNode => {
        counter += 1;
        return { type: "timelineAnchor", anchorId: `timeline-${counter}` };
      });
      parent.children.splice(index, 1, ...(anchors as unknown as MdastHtml[]));
      return index + anchors.length;
    });
  };
}

const timelineAnchorHandlers = {
  timelineAnchor: (_state: unknown, node: TimelineAnchorNode) => ({
    type: "element",
    tagName: "span",
    properties: { id: node.anchorId },
    children: [],
  }),
} as unknown as MdastToHastHandlers;

// Markdown bis zum private-Kommentar kürzen (GM-only-Inhalt danach entfernen).
// Von markdownToHtml genutzt, aber auch vom Timeline-Ingest (scripts/ingest/
// timeline.ts), der <!-- timeline -->-Marker nur im öffentlichen Teil sucht.
export function splitPrivate(markdown: string): string {
  return markdown.split("<!-- private -->")[0].trim();
}

// Markdown bis zum private-Kommentar kürzen und zu HTML konvertieren
export async function markdownToHtml(markdown: string): Promise<string> {
  const publicContent = splitPrivate(markdown);

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLinks)
    .use(remarkTimelineAnchors)
    .use(remarkRehype, { handlers: timelineAnchorHandlers })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(publicContent);

  return result.toString();
}

// Wie markdownToHtml, aber zusätzlich sanitisiert (rehype-sanitize,
// Default-Schema) — ausschließlich für Freitext von Usern (Dialog-
// Nachrichten). remark-rehype verwirft eingebettetes rohes HTML zwar
// schon standardmäßig (kein allowDangerousHtml gesetzt), lässt aber
// Markdown-Links mit gefährlichem URL-Schema (z.B. "javascript:") als
// <a href="..."> unverändert durch — bei GM-Vault-Inhalt nie relevant,
// bei beliebigem User-Freitext ein echter Stored-XSS-Vektor. Kein
// Wikilink-/Timeline-Anker-/private-Marker-Support hier (alles
// vault-spezifisch, für Chat-Nachrichten nicht sinnvoll).
export async function markdownToSafeHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, defaultSchema)
    .use(rehypeStringify)
    .process(markdown);

  return result.toString();
}

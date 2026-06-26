// scripts/ingest/shared.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element, Text } from "hast";

// Custom rehype-Plugin: ersetzt h2-Elemente durch LCARS DataRow HTML
function rehypeLcarsDataRows() {
  return (tree: Root) => {
    let chapterIndex = 0;

    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "h2" || !parent || index === undefined) return;

      chapterIndex++;

      // Kapitelname aus Text-Knoten extrahieren
      const label = node.children
        .filter((c): c is Text => c.type === "text")
        .map((c) => c.value)
        .join("");

      // ID wurde von rehypeSlug bereits gesetzt
      const id = (node.properties?.id as string) ?? "";

      const dataRow: Element = {
        type: "element",
        tagName: "div",
        properties: {
          className: ["lcars-data-row-heading"],
          id,
        },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["lcars-dr-value"] },
            children: [
              { type: "text", value: String(chapterIndex).padStart(2, "0") },
            ],
          },
          {
            type: "element",
            tagName: "span",
            properties: { className: ["lcars-dr-accent"] },
            children: [],
          },
          {
            type: "element",
            tagName: "span",
            properties: { className: ["lcars-dr-label"] },
            children: [{ type: "text", value: label.toUpperCase() }],
          },
        ],
      };

      parent.children.splice(index, 1, dataRow);
    });
  };
}

// Markdown bis zum private-Kommentar kürzen und zu HTML konvertieren
export async function markdownToHtml(markdown: string): Promise<string> {
  const publicContent = markdown.split("<!-- private -->")[0].trim();

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug) // IDs setzen – muss vor DataRows kommen
    // .use(rehypeLcarsDataRows) // h2 → LCARS DataRow
    .use(rehypeStringify)
    .process(publicContent);

  return result.toString();
}

// Slugs validieren – muss URL-sicher sein
export function validateSlug(slug: unknown, file: string): string {
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new Error(`Kein slug in ${file}`);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(
      `Ungültiger slug "${slug}" in ${file} – nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt`,
    );
  }
  return slug.trim();
}

// ISO-Datum validieren oder null zurückgeben
export function parseDate(value: unknown): string | null {
  if (!value) return null;

  // gray-matter parsed YYYY-MM-DD automatisch als Date-Objekt
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const str = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error(
      `Ungültiges Datumsformat "${str}" – erwartet wird YYYY-MM-DD`,
    );
  }
  return str;
}

export function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

export function toNumberArray(value: unknown): number[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

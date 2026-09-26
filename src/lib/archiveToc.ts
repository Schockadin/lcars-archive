import type { TocHeading } from "@/components/lcars";

const REFERENCES_ID = "archive-entry-verweise";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  let suffix = 2;
  while (used.has(id) || id === REFERENCES_ID) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

/** Ergänzt Abschnitts-IDs in Datenbank-HTML und liefert die passenden Sprungziele. */
export function buildArchiveToc(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const used = new Set<string>();

  const content = html.replace(
    /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, level: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]*>/g, "").trim();
      if (!text) return match;

      const existing = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
      const base = existing ?? `archive-${slugify(text) || "abschnitt"}`;
      const id = uniqueId(base, used);
      headings.push({ id, text });

      if (existing === id) return match;
      const withoutId = attrs.replace(/\s+id=["'][^"']*["']/i, "");
      return `<h${level}${withoutId} id="${id}">${inner}</h${level}>`;
    },
  );

  headings.push({ id: REFERENCES_ID, text: "Verweise" });
  return { html: content, headings };
}

export const ARCHIVE_REFERENCES_ID = REFERENCES_ID;

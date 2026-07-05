import { WIKILINK_RE } from "@/lib/markdown";

export interface WikilinkRemoval {
  original: string;
  replacement: string;
}

export interface WikilinkCleanupResult {
  sourceMd: string;
  removed: WikilinkRemoval[];
}

// Codeblöcke/Inline-Code/Bilder bleiben unangetastet — anders als bei
// applyAutolinks() (siehe src/lib/autolink.ts) müssen hier aber weder
// bestehende Markdown-Links noch Wikilinks selbst geschützt werden, denn
// genau Letztere sind ja das Ziel der Entfernung.
const PROTECTED_RE = /```[\s\S]*?```|`[^`\n]*`|!\[[^\]]*\]\([^)]*\)/g;

// Entfernt alle [[Ziel]]/[[Ziel|Text]]-Wikilinks (siehe remarkWikiLinks in
// src/lib/markdown.ts) aus dem Quelltext und ersetzt sie durch reinen
// Anzeigetext (Alias, falls vorhanden, sonst das Ziel selbst) — z.B. weil
// die Ziele durchs neue Autolinking-Feature ohnehin durch echte,
// sofort aufgelöste Links ersetzt werden und die alte, nur beim
// Vault-Ingest aufgelöste [[...]]-Syntax dadurch überflüssig bzw.
// fehleranfällig (dauerhaft "missing", falls das Ziel fehlt) wird.
export function stripWikilinks(sourceMd: string): WikilinkCleanupResult {
  const protectedRanges: [number, number][] = [];
  PROTECTED_RE.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = PROTECTED_RE.exec(sourceMd))) {
    protectedRanges.push([pm.index, pm.index + pm[0].length]);
  }
  const isProtected = (start: number, end: number) =>
    protectedRanges.some(([s, e]) => start < e && end > s);

  const removed: WikilinkRemoval[] = [];
  const parts: string[] = [];
  let lastIndex = 0;
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = WIKILINK_RE.exec(sourceMd))) {
    const start = m.index;
    const end = start + m[0].length;
    if (isProtected(start, end)) continue;

    const [full, target, alias] = m;
    const replacement = (alias ?? target).trim();
    parts.push(sourceMd.slice(lastIndex, start));
    parts.push(replacement);
    removed.push({ original: full, replacement });
    lastIndex = end;
  }
  parts.push(sourceMd.slice(lastIndex));

  return { sourceMd: parts.join(""), removed };
}

"use client";
import { useId, useState } from "react";

// Kompaktes Cheatsheet der im Ingest/Renderer unterstützten Syntax (siehe
// src/lib/markdown.ts: remark-gfm + remarkWikiLinks) — bewusst keine
// vollständige CommonMark-Referenz, nur die im Alltag gebrauchten Grundlagen.
const CHEATSHEET: { syntax: string; label: string }[] = [
  { syntax: "# Überschrift", label: "Überschrift" },
  { syntax: "**fett**", label: "Fett" },
  { syntax: "*kursiv*", label: "Kursiv" },
  { syntax: "[Text](https://…)", label: "Link" },
  { syntax: "- Eintrag", label: "Aufzählung" },
  { syntax: "1. Eintrag", label: "Nummerierte Liste" },
  { syntax: "> Zitat", label: "Zitat" },
  { syntax: "`Code`", label: "Inline-Code" },
  { syntax: "~~Text~~", label: "Durchgestrichen" },
  { syntax: "[[Ziel]]", label: "Wikilink (automatisch verlinkt)" },
];

// Hoverbares (und tastatur-fokussierbares) Wort "Markdown" — zeigt beim
// Hovern/Fokussieren ein kleines Popover mit den gängigsten
// Formatierungen. Hover-Zustand lebt auf dem äußeren Wrapper statt nur dem
// Wort selbst, damit die Maus auch ins Popover wandern kann (z.B. um Text
// daraus zu markieren), ohne dass es sofort wieder verschwindet. onClick
// als Toggle zusätzlich zu Hover/Fokus — auf Touch-Geräten gibt es kein
// echtes Hover.
export function MarkdownHoverWord() {
  const [open, setOpen] = useState(false);
  const popoverId = useId();

  return (
    <span
      className="markdown-hint"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="markdown-hint-trigger"
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-describedby={popoverId}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        Markdown
      </span>
      {open && (
        <span id={popoverId} className="markdown-hint-popover" role="tooltip">
          <span className="markdown-hint-popover-title">
            Markdown-Formatierung
          </span>
          <span className="markdown-hint-popover-list">
            {CHEATSHEET.map((row) => (
              <span key={row.syntax} className="markdown-hint-popover-row">
                <code>{row.syntax}</code>
                <span>{row.label}</span>
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

// Fertiger Hinweistext für FormField#hint — ersetzt den bisherigen reinen
// String "Unterstützt Markdown-Formatierung." überall dort, wo Content-
// Textareas darauf hinweisen.
export function MarkdownFormatHint() {
  return (
    <>
      Unterstützt <MarkdownHoverWord />-Formatierung.
    </>
  );
}

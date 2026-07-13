"use client";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { sql as sqlLanguage } from "@codemirror/lang-sql";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

export type CodeEditorLanguage = "sql" | "markdown";

const LANGUAGE_EXTENSIONS: Record<CodeEditorLanguage, () => Extension> = {
  sql: () => sqlLanguage(),
  markdown: () => markdownLanguage(),
};

// LCARS-Farbschema statt eines mitgelieferten CodeMirror-Themes — dieselben
// CSS-Variablen wie überall sonst in der App (tokens.css), damit der Editor
// sich einfügt statt wie ein Fremdkörper zu wirken.
const lcarsHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--lcars-blue)", fontWeight: "600" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--lcars-amber)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--lcars-purple)" },
  { tag: [tags.comment, tags.lineComment], color: "var(--lcars-text-dim)", fontStyle: "italic" },
  { tag: tags.heading, color: "var(--lcars-amber)", fontWeight: "700" },
  { tag: tags.link, color: "var(--lcars-blue)", textDecoration: "underline" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.monospace, color: "var(--lcars-purple)" },
]);

const lcarsEditorTheme = EditorView.theme({
  "&": {
    color: "var(--lcars-text)",
    backgroundColor: "var(--lcars-surface)",
    border: "1px solid var(--lcars-border)",
    borderRadius: "8px",
    fontSize: "13px",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--lcars-blue)",
  },
  ".cm-content": {
    fontFamily: "var(--font-share-tech-mono), monospace",
    padding: "12px 16px",
    caretColor: "var(--lcars-text-data)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--lcars-text-data)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(154, 154, 255, 0.35)",
  },
  ".cm-placeholder": {
    color: "var(--lcars-text-dim)",
  },
});

// Wiederverwendbarer Code-Editor auf Basis von CodeMirror (@uiw/react-
// codemirror) — löst die früher hier gebaute "transparente Textarea über
// farbigem <pre>"-Technik ab, deren Zeichenbreiten je nach Font-Vererbung
// auseinanderdriften konnten (Cursor und sichtbarer Text passten nicht mehr
// zusammen). CodeMirror verwaltet Cursor/Selektion selbst statt über zwei
// separate DOM-Ebenen synchron zu halten. Aktuell für SQL im Einsatz
// (SqlQueryPanel.tsx), language="markdown" ist für eine spätere Ablösung
// der bestehenden MarkdownEditor.tsx (reine Textarea + Toolbar, kein
// Syntaxhighlighting) vorbereitet, aber noch nirgends verdrahtet.
export default function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  minHeight = "140px",
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  language: CodeEditorLanguage;
  placeholder?: string;
  minHeight?: string;
  // Optionaler Name für ein verstecktes <input>, damit der Editor innerhalb
  // eines normalen <form action={serverAction}>-Submits funktioniert (die
  // von CodeMirror verwaltete Eingabe ist kein echtes Formularelement).
  name?: string;
}) {
  return (
    <div className="lcars-code-editor">
      <CodeMirror
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        theme={lcarsEditorTheme}
        minHeight={minHeight}
        extensions={[
          LANGUAGE_EXTENSIONS[language](),
          syntaxHighlighting(lcarsHighlightStyle),
        ]}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}

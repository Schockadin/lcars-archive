"use client";
import { useRef, useState } from "react";
import { wrapSelection, applyLinePrefix } from "@/lib/textareaEdit";
import { renderMarkdownPreview } from "@/app/actions/markdownPreview";
import TimelineMarkerButton from "./TimelineMarkerButton";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function BoldIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 4v16M7 4h5a3.5 3.5 0 0 1 0 7H7M7 11h6a3.5 3.5 0 0 1 0 7H7" />
    </svg>
  );
}
function ItalicIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10 4h6M8 20h6M14 4l-4 16" />
    </svg>
  );
}
function HeadingIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 4v16M18 4v16M6 12h12" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10 14a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 10a5 5 0 0 0-7.07 0L4.8 12.12a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function OrderedListIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <text x="1.5" y="8.5" fontSize="7" fill="currentColor" stroke="none">
        1
      </text>
      <text x="1.5" y="14.5" fontSize="7" fill="currentColor" stroke="none">
        2
      </text>
      <text x="1.5" y="20.5" fontSize="7" fill="currentColor" stroke="none">
        3
      </text>
    </svg>
  );
}
function QuoteIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 5v14M9 8h11M9 12h11M9 16h7" />
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 6 2 12l6 6M16 6l6 6-6 6" />
    </svg>
  );
}

interface ToolbarAction {
  label: string;
  icon: React.ReactNode;
  run: (textarea: HTMLTextAreaElement) => void;
}

const ACTIONS: ToolbarAction[] = [
  {
    label: "Fett",
    icon: <BoldIcon />,
    run: (el) => wrapSelection(el, "**", "**", "fett"),
  },
  {
    label: "Kursiv",
    icon: <ItalicIcon />,
    run: (el) => wrapSelection(el, "*", "*", "kursiv"),
  },
  {
    label: "Überschrift",
    icon: <HeadingIcon />,
    run: (el) => applyLinePrefix(el, () => "## "),
  },
  {
    label: "Link",
    icon: <LinkIcon />,
    run: (el) => wrapSelection(el, "[", "](https://)", "Linktext"),
  },
  {
    label: "Aufzählung",
    icon: <ListIcon />,
    run: (el) => applyLinePrefix(el, () => "- "),
  },
  {
    label: "Nummerierte Liste",
    icon: <OrderedListIcon />,
    run: (el) => applyLinePrefix(el, (i) => `${i + 1}. `),
  },
  {
    label: "Zitat",
    icon: <QuoteIcon />,
    run: (el) => applyLinePrefix(el, () => "> "),
  },
  {
    label: "Code",
    icon: <CodeIcon />,
    run: (el) => {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const multiline = el.value.slice(start, end).includes("\n");
      if (multiline) {
        wrapSelection(el, "```\n", "\n```", "code");
      } else {
        wrapSelection(el, "`", "`", "code");
      }
    },
  },
];

// Markdown-Editor mit Formatierungs-Toolbar + Rohtext/Vorschau-Umschalter —
// ersetzt die bisherigen einfachen <textarea>-Felder an allen Content-
// Textstellen (Mission/Mission-Log/Archiv-Eintrag/Charakter-Formulare +
// Inline-Editoren). Bleibt wie zuvor unkontrolliert (defaultValue/name statt
// value/onChange) — die Toolbar-Buttons manipulieren die Textarea per DOM
// (siehe src/lib/textareaEdit.ts), exakt wie TimelineMarkerButton das schon
// für den Marker-Einfügen-Knopf tut. Die Textarea bleibt beim Umschalten auf
// "Vorschau" gemountet (nur per CSS versteckt) statt bedingt gerendert zu
// werden — sonst würde ein Wechsel zurück zu "Rohtext" den zuletzt
// getippten (noch ungespeicherten) Text verlieren.
export default function MarkdownEditor({
  id,
  name = "bodyMarkdown",
  defaultValue,
  required = false,
  isAdminOrGM = false,
  large = false,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  // Nur relevant für Formulare, die den Timeline-Marker-Button überhaupt
  // zeigen dürfen (siehe TimelineMarkerButton.tsx-Aufrufer) — hier als
  // Icon-Button in der Toolbar statt als eigenständige Textpille darüber.
  isAdminOrGM?: boolean;
  // Größere Mindesthöhe für die vollen New-/Edit-Formulare (400px) statt
  // der kompakteren Inline-Editoren (300px) — zwei feste Tailwind-Klassen,
  // da sich Utility-Klassen nicht dynamisch aus Props zusammensetzen lassen.
  large?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"raw" | "preview">("raw");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPending, setPreviewPending] = useState(false);

  function runAction(action: ToolbarAction) {
    const el = textareaRef.current;
    if (!el) return;
    action.run(el);
  }

  async function showPreview() {
    const el = textareaRef.current;
    if (!el) return;
    setPreviewPending(true);
    const html = await renderMarkdownPreview(el.value);
    setPreviewHtml(html);
    setPreviewPending(false);
    setMode("preview");
  }

  return (
    <div className="markdown-editor mt-[5px]">
      <div className="markdown-editor-toolbar flex flex-wrap items-center gap-[6px] mb-[5px]">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="lcars-icon-btn"
            aria-label={action.label}
            title={action.label}
            onClick={() => runAction(action)}
          >
            {action.icon}
          </button>
        ))}
        {isAdminOrGM && <TimelineMarkerButton textareaId={id} iconOnly />}

        <div className="markdown-editor-tabs">
          <button
            type="button"
            className={`lcars-switch${mode === "raw" ? " lcars-switch--active" : ""}`}
            onClick={() => setMode("raw")}
          >
            Rohtext
          </button>
          <button
            type="button"
            className={`lcars-switch${mode === "preview" ? " lcars-switch--active" : ""}`}
            disabled={previewPending}
            onClick={showPreview}
          >
            {previewPending ? "Lädt…" : "Vorschau"}
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className={`rounded-lcars-pill lcars-input w-full resize-y font-mono ${
          large ? "min-h-[400px]" : "min-h-[300px]"
        } ${mode === "preview" ? "hidden" : ""}`}
      />

      {mode === "preview" && (
        <div
          className={`mission-body lcars-text markdown-editor-preview ${
            large ? "min-h-[400px]" : "min-h-[300px]"
          }`}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}

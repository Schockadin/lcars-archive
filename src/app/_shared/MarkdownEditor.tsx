"use client";
import { useEffect, useRef, useState } from "react";
import { wrapSelection, applyLinePrefix } from "@/lib/textareaEdit";
import { renderMarkdownPreview } from "@/app/actions/markdownPreview";
import { getEditorSpellcheckPreferenceAction } from "@/app/actions/editorPreferences";
import TimelineMarkerButton from "./TimelineMarkerButton";
import InsertImageButton from "./InsertImageButton";
import { LcarsSwitch } from "@/components/lcars";
import type { ContentImageType } from "@/lib/contentImages";
import {
  BoldIcon,
  ItalicIcon,
  HeadingIcon,
  LinkIcon,
  ListIcon,
  OrderedListIcon,
  QuoteIcon,
  CodeIcon,
} from "@/lib/icons";
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
  rows,
  insertImage,
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
  // Mindesthöhe in Zeilen statt in Pixeln — für Felder, die in ein Panel
  // eingebettet sind (Notizen, Regeltexte) und nicht die 300/400px der
  // Content-Formulare brauchen, aber trotzdem genug Platz zum Schreiben.
  // Gesetzt, gewinnt es gegen `large`.
  rows?: number;
  // Nur gesetzt, wenn der Inhalt bereits existiert (contentId bekannt) —
  // ohne das kann noch kein Bild dafür hochgeladen worden sein (siehe
  // InsertImageButton.tsx). Charaktere bewusst ausgenommen: dort gibt es
  // stattdessen Portrait-Auswahl + Karussell statt Bild-Einbettung im
  // Fließtext (siehe CharacterPortrait.tsx/ContentImageGallery.tsx).
  insertImage?: { contentType: ContentImageType; contentId: number };
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"raw" | "preview">("raw");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPending, setPreviewPending] = useState(false);
  // DB-Default ist true (siehe getEditorSpellcheckPreference in
  // lib/users.ts) — als Startwert übernommen, damit der häufige Fall (Prüfung
  // aktiv) ohne sichtbares Aufflackern gerendert wird; nur bei explizit
  // deaktivierter Präferenz wechselt der Wert nach dem Client-Fetch.
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getEditorSpellcheckPreferenceAction().then((enabled) => {
      if (!cancelled) setSpellCheckEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {insertImage && (
          <InsertImageButton
            textareaId={id}
            contentType={insertImage.contentType}
            contentId={insertImage.contentId}
          />
        )}

        <LcarsSwitch
          className="markdown-editor-tabs"
          options={[
            { key: "raw", label: "Rohtext" },
            {
              key: "preview",
              label: previewPending ? "Lädt…" : "Vorschau",
              disabled: previewPending,
            },
          ]}
          active={mode}
          onChange={(next) => (next === "preview" ? showPreview() : setMode("raw"))}
        />
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        spellCheck={spellCheckEnabled}
        rows={rows}
        className={`rounded-lcars-pill lcars-input w-full resize-y font-mono ${
          rows ? "h-auto" : large ? "min-h-[400px]" : "min-h-[300px]"
        } ${mode === "preview" ? "hidden" : ""}`}
      />

      {mode === "preview" && (
        <div
          className={`mission-body lcars-text markdown-editor-preview ${
            // Ohne feste Mindesthöhe würde die Vorschau eines kurzen Textes
            // das Panel zusammenklappen lassen; mit rows richtet sie sich nach
            // derselben Zeilenzahl wie das Eingabefeld.
            rows ? "" : large ? "min-h-[400px]" : "min-h-[300px]"
          }`}
          style={rows ? { minHeight: `${rows * 1.5}em` } : undefined}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}

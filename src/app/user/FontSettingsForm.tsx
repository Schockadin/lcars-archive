"use client";
import { useActionState, useEffect, useState } from "react";
import { updateFontsAction, type FontState } from "./fontActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import {
  FONT_SANS_OPTIONS,
  FONT_MONO_OPTIONS,
  DEFAULT_FONT_SANS,
  DEFAULT_FONT_MONO,
  normalizeFontSans,
  normalizeFontMono,
} from "@/lib/fonts";

const initialState: FontState = {};

// Wendet die Schriftwahl sofort clientseitig an (Live-Vorschau):
// data-font-sans/data-font-mono hängen die beiden kanonischen Schrift-Stacks
// um (src/styles/fonts.css). Für die Vorgabe wird das Attribut entfernt statt
// gesetzt — dann gelten wieder die Werte aus tokens.css.
function applyPreview(fontSans: string, fontMono: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (fontSans === DEFAULT_FONT_SANS) {
    root.removeAttribute("data-font-sans");
  } else {
    root.setAttribute("data-font-sans", fontSans);
  }

  if (fontMono === DEFAULT_FONT_MONO) {
    root.removeAttribute("data-font-mono");
  } else {
    root.setAttribute("data-font-mono", fontMono);
  }
}

// Schriftwahl im Profil (/user). Zwei Gruppen von Radio-Karten — dieselbe Form
// wie bei Hell/Dunkel und Oberfläche —, eine je Textrolle: die Beschriftungs-/
// Fließtextschrift und die Mono-/Datenschrift lassen sich unabhängig
// voneinander umstellen. Die Vorschau greift sofort, gespeichert wird erst mit
// „Speichern".
export default function FontSettingsForm({
  currentSans,
  currentMono,
}: {
  currentSans: string;
  currentMono: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateFontsAction,
    initialState,
  );

  const [sans, setSans] = useState(() => normalizeFontSans(currentSans));
  const [mono, setMono] = useState(() => normalizeFontMono(currentMono));

  useEffect(() => {
    applyPreview(sans, mono);
  }, [sans, mono]);

  return (
    <form action={formAction} className="flex flex-col gap-[20px]">
      <input type="hidden" name="fontSans" value={sans} />
      <input type="hidden" name="fontMono" value={mono} />

      <p className="text-lcars-ink-dim text-[13px]">
        Die Vorschau erscheint sofort; gespeichert wird sie erst mit
        „Speichern“. Beide Schriften werden mit dem Archiv ausgeliefert — es
        geht keine Anfrage an fremde Server.
      </p>

      <FontChoice
        legend="Überschriften und Fließtext"
        hint="Trägt Menü, Überschriften, Pillen und die Texte."
        name="font-sans-choice"
        options={FONT_SANS_OPTIONS}
        selected={sans}
        onSelect={setSans}
        preview="Neo Archive · Chronologie"
        previewStyle="sans"
      />

      <FontChoice
        legend="Daten und Code"
        hint="Trägt die Mono-Zeilen der Karten, die Aktenfelder und Codeblöcke."
        name="font-mono-choice"
        options={FONT_MONO_OPTIONS}
        selected={mono}
        onSelect={setMono}
        preview="SD 2401-06-12 · 4711"
        previewStyle="mono"
      />

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

// Eine der beiden Auswahlgruppen. Jede Karte zeigt die Schrift an einem
// Beispielsatz in ihr selbst — die Wahl trifft man am Aussehen, nicht am
// Namen.
function FontChoice({
  legend,
  hint,
  name,
  options,
  selected,
  onSelect,
  preview,
  previewStyle,
}: {
  legend: string;
  hint: string;
  name: string;
  options: { id: string; label: string; description: string }[];
  selected: string;
  onSelect: (id: string) => void;
  preview: string;
  previewStyle: "sans" | "mono";
}) {
  return (
    <fieldset className="flex flex-col gap-[8px]">
      <legend className="lcars-eyebrow">{legend}</legend>
      <p className="text-lcars-ink-dim text-[12px]">{hint}</p>

      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <label
            key={option.id}
            className={`relative flex items-center gap-[12px] rounded-[var(--lcars-radius-pill)] border px-[16px] py-[10px] cursor-pointer transition-colors ${
              isSelected
                ? "border-lcars-primary bg-lcars-surface-2"
                : "border-lcars-border bg-lcars-surface"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={isSelected}
              onChange={() => onSelect(option.id)}
              className="sr-only"
            />
            <span className="flex flex-col gap-[2px] min-w-0">
              <span
                className={`lcars-eyebrow ${
                  isSelected ? "text-lcars-primary-ink" : "text-lcars-ink-light"
                }`}
              >
                {option.label}
              </span>
              <span className="text-lcars-ink-dim text-[12px]">
                {option.description}
              </span>
              {/* Das Beispiel in der jeweiligen Schrift: die Familien sind
                  auf <html> als CSS-Variablen angemeldet (siehe layout.tsx),
                  hier wird die passende direkt gesetzt — unabhängig davon,
                  was gerade ausgewählt ist. */}
              <span
                className="text-[15px] text-lcars-ink truncate"
                style={{
                  fontFamily: `var(${cssVariableOf(option.id, previewStyle)})`,
                }}
              >
                {preview}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

// Die next/font-Variable einer Schrift (siehe FontOption.cssVariable in
// src/lib/fonts.ts) — für das Beispiel auf der Karte.
function cssVariableOf(id: string, style: "sans" | "mono"): string {
  const options = style === "sans" ? FONT_SANS_OPTIONS : FONT_MONO_OPTIONS;
  return (
    options.find((option) => option.id === id)?.cssVariable ??
    (style === "sans" ? "--lcars-font-sans" : "--lcars-font-mono")
  );
}

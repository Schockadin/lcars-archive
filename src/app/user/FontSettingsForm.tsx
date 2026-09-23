"use client";
import { useActionState, useEffect, useState } from "react";
import { updateFontsAction, type FontState } from "./fontActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import ChoiceCardGroup from "@/app/_shared/ChoiceCardGroup";
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

      <ChoiceCardGroup
        legend="Überschriften und Fließtext"
        hint="Trägt Menü, Überschriften, Pillen und die Texte."
        name="font-sans-choice"
        options={FONT_SANS_OPTIONS}
        selected={sans}
        onSelect={setSans}
        renderPreview={(option) => (
          <FontPreview
            optionId={option.id}
            text="Neo Archive · Chronologie"
            style="sans"
          />
        )}
      />

      <ChoiceCardGroup
        legend="Daten und Code"
        hint="Trägt die Mono-Zeilen der Karten, die Aktenfelder und Codeblöcke."
        name="font-mono-choice"
        options={FONT_MONO_OPTIONS}
        selected={mono}
        onSelect={setMono}
        renderPreview={(option) => (
          <FontPreview
            optionId={option.id}
            text="SD 2401-06-12 · 4711"
            style="mono"
          />
        )}
      />

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

function FontPreview({
  optionId,
  text,
  style,
}: {
  optionId: string;
  text: string;
  style: "sans" | "mono";
}) {
  return (
    <span
      className="text-[15px] text-lcars-ink truncate"
      style={{ fontFamily: `var(${cssVariableOf(optionId, style)})` }}
    >
      {text}
    </span>
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

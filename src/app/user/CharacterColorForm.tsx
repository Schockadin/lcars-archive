"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updateCharacterColorAction,
  type CharacterColorState,
} from "@/app/actions/characterColor";
import {
  LCARS_COLOR_PRESETS,
  colorizeDirectSpeech,
  normalizeHex,
} from "@/lib/characterColor";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";

const initialState: CharacterColorState = {};

// Beispiel-Dialog für die Live-Vorschau (wörtliche Rede in der gewählten
// Farbe). Bereits „HTML" mit deutschen Anführungszeichen, damit
// colorizeDirectSpeech es genauso einfärbt wie einen echten Fließtext.
const PREVIEW_HTML =
  "<p>Sie blickte auf und sagte: „Lorem ipsum, dolor sit amet.“</p>" +
  "<p>Er nickte langsam. „Consetetur sadipscing elitr“, erwiderte er ruhig.</p>";

// Farbwähler im Profil (/user) — dort einmal PRO CHARAKTER gerendert (siehe
// die Liste in page.tsx), nicht mehr auf der jeweiligen Charakter-
// Detailseite: ein User mit mehreren Charakteren ("Multis") sieht so alle
// seine Charaktere samt Farbwahl an einem Ort statt einzeln auf verstreuten
// Seiten. Sechs LCARS-Preset-Swatches PLUS ein freier Color-Picker. Bereits
// von ANDEREN Charakteren belegte Farben (takenColors) sind gesperrt — auch
// von den EIGENEN übrigen Charakteren, der partielle UNIQUE-Index in der DB
// macht jede Farbe global exklusiv; die eigene aktuelle Farbe (ownColor)
// bleibt immer wählbar. Darunter eine Live-Vorschau eines Beispiel-Dialogs in
// der gewählten Farbe. Kontrollierter State (kein defaultChecked-Remount-
// Trick nötig).
export default function CharacterColorForm({
  characterId,
  ownColor,
  takenColors,
}: {
  characterId: number;
  ownColor: string; // Hex, aktuelle/abgeleitete Farbe dieses Charakters
  takenColors: string[]; // Hex, von ANDEREN Charakteren belegt
}) {
  const [state, formAction, pending] = useActionState(
    updateCharacterColorAction,
    initialState,
  );
  const [selected, setSelected] = useState<string>(normalizeHex(ownColor));

  const taken = useMemo(
    () => new Set(takenColors.map(normalizeHex)),
    [takenColors],
  );

  const previewHtml = useMemo(
    () => colorizeDirectSpeech(PREVIEW_HTML, selected),
    [selected],
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <p className="text-lcars-text-dim text-[13px]">
        Diese Farbe färbt die wörtliche Rede dieses Charakters im
        Fließtext-Modus abgeschlossener Gespräche sowie seine
        Nachrichten-Karten in Gesprächen ein. Bereits von anderen Charakteren
        vergebene Farben sind gesperrt.
      </p>

      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="characterColor" value={selected} />

      <div
        role="radiogroup"
        aria-label="Charakter-Farbe"
        className="flex flex-wrap items-center gap-[12px]"
      >
        {LCARS_COLOR_PRESETS.map((preset) => {
          const hex = normalizeHex(preset.hex);
          const isOwn = hex === normalizeHex(ownColor);
          const isTaken = taken.has(hex) && !isOwn;
          const active = hex === selected;
          return (
            <button
              key={preset.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={
                preset.label + (isTaken ? " (bereits vergeben)" : "")
              }
              title={preset.label + (isTaken ? " — bereits vergeben" : "")}
              disabled={isTaken}
              onClick={() => setSelected(hex)}
              className={`size-[40px] rounded-full border-2 transition-transform ${
                active
                  ? "border-lcars-text-contrast scale-110"
                  : "border-transparent opacity-70 hover:opacity-100"
              } ${isTaken ? "opacity-30 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: preset.hex }}
            />
          );
        })}

        {/* Freier Color-Picker für individuelle Farben. */}
        <label
          className="flex items-center gap-[8px] text-[13px] cursor-pointer"
          title="Eigene Farbe wählen"
        >
          <span className="lcars-eyebrow">Eigene</span>
          <input
            type="color"
            aria-label="Eigene Farbe wählen"
            value={selected}
            onChange={(e) => setSelected(normalizeHex(e.target.value))}
            className="size-[40px] cursor-pointer rounded-full border-2 border-lcars-border bg-transparent p-0"
          />
        </label>
      </div>

      {/* Live-Vorschau: kleiner Beispiel-Dialog in der gewählten Farbe. */}
      <div className="flex flex-col gap-[4px]">
        <span className="lcars-eyebrow">Vorschau</span>
        <div
          className="mission-body lcars-text rounded-[4px] border border-lcars-border bg-lcars-surface p-[12px] text-[15px]"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>Gespeichert.</FormSuccess>}

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Farbe speichern
      </SubmitButton>
    </form>
  );
}

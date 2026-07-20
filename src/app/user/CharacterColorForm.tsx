"use client";

import { useActionState, useState } from "react";
import {
  updateCharacterColorAction,
  type CharacterColorState,
} from "@/app/actions/characterColor";
import {
  CHARACTER_COLOR_KEYS,
  CHARACTER_COLOR_LABELS,
  characterColorVar,
  type CharacterColorKey,
} from "@/lib/characterColor";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";

const initialState: CharacterColorState = {};

// Farbwähler im Profil (/user): sechs LCARS-Farb-Swatches, die aktuell
// gewählte ist umrandet. Kontrollierter State (statt defaultChecked) — dadurch
// kein optischer Nach-dem-Speichern-Rücksprung wie bei den unkontrollierten
// Checkbox-Formularen, ohne den saveCount-Remount-Trick. Der resolved-Wert
// (explizite Wahl oder aus der User-ID abgeleiteter Default) kommt als
// initialColor von der Profilseite.
export default function CharacterColorForm({
  initialColor,
}: {
  initialColor: CharacterColorKey;
}) {
  const [state, formAction, pending] = useActionState(
    updateCharacterColorAction,
    initialState,
  );
  const [selected, setSelected] = useState<CharacterColorKey>(initialColor);

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <p className="text-lcars-text-dim text-[13px]">
        Diese Farbe färbt die wörtliche Rede deiner Charaktere im
        Fließtext-Modus abgeschlossener Gespräche ein.
      </p>

      <input type="hidden" name="characterColor" value={selected} />

      <div
        role="radiogroup"
        aria-label="Charakter-Farbe"
        className="flex flex-wrap gap-[12px]"
      >
        {CHARACTER_COLOR_KEYS.map((key) => {
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={CHARACTER_COLOR_LABELS[key]}
              title={CHARACTER_COLOR_LABELS[key]}
              onClick={() => setSelected(key)}
              className={`size-[40px] rounded-full border-2 transition-transform ${
                active
                  ? "border-lcars-text-contrast scale-110"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: characterColorVar(key) }}
            />
          );
        })}
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

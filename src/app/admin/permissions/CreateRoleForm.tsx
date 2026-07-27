"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createRoleAction, type RolesState } from "./actions";
import PermissionCheckboxList from "./PermissionCheckboxList";
import { slugifyBase } from "@/lib/slug";
import {
  FormField,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

const initialState: RolesState = {};

// Legt eine neue eigene Rolle an. Der Schlüssel wird serverseitig aus dem Namen
// abgeleitet (slugify) — hier live vorab angezeigt, damit die anlegende Person
// sieht, unter welchem Schlüssel die Rolle entsteht (und eine Kollisionsmeldung
// einordnen kann).
export default function CreateRoleForm() {
  const [state, formAction, pending] = useActionState(
    createRoleAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Nur für die Schlüssel-Live-Vorschau (das Namensfeld selbst bleibt
  // unkontrolliert und wird bei Erfolg via formRef.reset() geleert).
  const [labelPreview, setLabelPreview] = useState("");
  const derivedKey = slugifyBase(labelPreview);

  // Nach erfolgreichem Anlegen das (unkontrollierte) Formular zurücksetzen — die
  // neu angelegte Rolle erscheint durch die Revalidierung unten in der Liste.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  // Vorschau-State beim erfolgreichen Absenden zurücksetzen — bewusst als
  // State-Anpassung WÄHREND des Renders (React-empfohlenes Muster) statt in
  // einem Effect, wo ein setState kaskadierende Re-Renders auslöste.
  const [lastSuccess, setLastSuccess] = useState(state.success);
  if (state.success !== lastSuccess) {
    setLastSuccess(state.success);
    if (state.success) setLabelPreview("");
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-[12px]">
      <FormField
        label="Name der Rolle"
        htmlFor="new-role-label"
        hint={
          labelPreview.trim() !== "" ? (
            <>
              Schlüssel: <code>{derivedKey}</code>
            </>
          ) : undefined
        }
      >
        <input
          id="new-role-label"
          name="label"
          type="text"
          required
          onChange={(e) => setLabelPreview(e.target.value)}
          placeholder="z. B. Chronist"
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="Beschreibung (optional)" htmlFor="new-role-description">
        <input
          id="new-role-description"
          name="description"
          type="text"
          placeholder="Wofür ist diese Rolle gedacht?"
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <fieldset className="flex flex-col gap-[8px]">
        <legend className="lcars-eyebrow">Rechte</legend>
        <PermissionCheckboxList selected={[]} idPrefix="new-role" />
      </fieldset>

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>Rolle angelegt.</FormSuccess>}

      <SubmitButton
        pending={pending}
        pendingLabel="Anlegen…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        Rolle anlegen
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRoleAction, type RolesState } from "./actions";
import PermissionCheckboxList from "./PermissionCheckboxList";
import {
  FormField,
  FormError,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

const initialState: RolesState = {};

// Legt eine neue eigene Rolle an. Der Schlüssel wird serverseitig aus dem Namen
// abgeleitet (slugify).
export default function CreateRoleForm() {
  const [state, formAction, pending] = useActionState(
    createRoleAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Nach erfolgreichem Anlegen die Eingaben zurücksetzen (die neu angelegte
  // Rolle erscheint durch die Revalidierung unten in der Liste).
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-[12px]">
      <FormField label="Name der Rolle" htmlFor="new-role-label">
        <input
          id="new-role-label"
          name="label"
          type="text"
          required
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

"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "./settingsActions";
import { FormField, SaveFooter } from "@/app/_shared/FormPrimitives";

const initialState: SettingsState = {};

export default function SettingsForm({
  user,
}: {
  user: { name: string; email: string };
}) {
  const [state, formAction, pending] = useActionState(
    updateSettings,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <FormField label="Name" htmlFor="name">
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={user.name}
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="E-Mail-Adresse" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

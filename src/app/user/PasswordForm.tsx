"use client";

import { useActionState } from "react";
import { updatePasswordAction, type PasswordState } from "./passwordActions";
import {
  FormField,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import PasswordInput from "@/app/_shared/PasswordInput";

const initialState: PasswordState = {};

export default function PasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      {hasPassword && (
        <FormField label="Aktuelles Passwort" htmlFor="currentPassword">
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="rounded-lcars-pill lcars-input"
          />
        </FormField>
      )}

      <FormField
        label={hasPassword ? "Neues Passwort" : "Passwort festlegen"}
        htmlFor="newPassword"
      >
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="Passwort wiederholen" htmlFor="confirmPassword">
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>Passwort gespeichert.</FormSuccess>}

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        {hasPassword ? "Passwort ändern" : "Passwort festlegen"}
      </SubmitButton>
    </form>
  );
}

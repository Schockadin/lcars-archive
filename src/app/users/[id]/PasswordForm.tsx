"use client";

import { useActionState } from "react";
import { updatePasswordAction, type PasswordState } from "./passwordActions";
import {
  FormField,
  FormError,
  FormSuccess,
  SubmitButton,
} from "../_shared/FormPrimitives";

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
    <form
      action={formAction}
      className="flex max-w-[var(--lcars-content-w)] flex-col gap-[16px]"
    >
      {hasPassword && (
        <FormField label="Aktuelles Passwort" htmlFor="currentPassword">
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
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
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="Passwort wiederholen" htmlFor="confirmPassword">
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
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
        className="lcars-switch self-end disabled:opacity-50 w-[100%]"
      >
        {hasPassword ? "Passwort ändern" : "Passwort festlegen"}
      </SubmitButton>
    </form>
  );
}

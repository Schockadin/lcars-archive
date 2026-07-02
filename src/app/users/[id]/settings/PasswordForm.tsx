"use client";

import { useActionState } from "react";
import { updatePasswordAction, type PasswordState } from "./passwordActions";

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
      className="flex max-w-[420px] flex-col gap-[16px]"
    >
      {hasPassword && (
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="currentPassword" className="lcars-eyebrow">
            Aktuelles Passwort
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
          />
        </div>
      )}

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="newPassword" className="lcars-eyebrow">
          {hasPassword ? "Neues Passwort" : "Passwort festlegen"}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="confirmPassword" className="lcars-eyebrow">
          Passwort wiederholen
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        />
      </div>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-lcars-green" role="status">
          Passwort gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch lcars-switch--primary self-start disabled:opacity-50"
      >
        {pending
          ? "Speichern…"
          : hasPassword
            ? "Passwort ändern"
            : "Passwort festlegen"}
      </button>
    </form>
  );
}

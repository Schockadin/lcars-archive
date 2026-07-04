"use client";

import { useActionState } from "react";
import { activateAccount, type ActivateState } from "./actions";

const initialState: ActivateState = {};

export default function ActivateForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    activateAccount,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-[420px] flex-col gap-[16px]">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="password" className="lcars-eyebrow">
          Neues Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          minLength={10}
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
          autoComplete="new-password"
          minLength={10}
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        />
      </div>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="lcars-switch self-start disabled:opacity-50">
        {pending ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}

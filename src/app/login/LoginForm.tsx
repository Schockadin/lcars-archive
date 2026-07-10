"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className="flex max-w-[420px] flex-col gap-[16px]"
    >
      <div className="flex flex-col gap-[6px]">
        <label htmlFor="email" className="lcars-eyebrow">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          className="rounded-lcars-pill lcars-input"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="password" className="lcars-eyebrow">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lcars-pill lcars-input"
        />
        <a
          href="/forgot-password"
          className="self-end text-lcars-text-dim text-[13px] underline"
        >
          Passwort vergessen?
        </a>
      </div>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Anmelden…" : "Anmelden"}
      </button>
    </form>
  );
}

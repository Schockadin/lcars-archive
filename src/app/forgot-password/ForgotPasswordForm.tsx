"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "./actions";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  if (state?.submitted) {
    return (
      <div className="flex flex-col gap-[16px]">
        <p>
          Falls zu dieser E-Mail-Adresse ein aktives Konto existiert, haben wir
          gerade einen Link zum Festlegen eines neuen Passworts verschickt.
        </p>
        <p>
          <a href="/login" className="text-lcars-amber underline">
            ← Zurück zum Login
          </a>
        </p>
      </div>
    );
  }

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
        {pending ? "Wird gesendet…" : "Link anfordern"}
      </button>
    </form>
  );
}

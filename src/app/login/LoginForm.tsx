"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { clearServiceWorkerPageCache } from "@/lib/swCache";
import PasswordInput from "@/app/_shared/PasswordInput";
import { FormError } from "@/app/_shared/FormPrimitives";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className="flex max-w-[420px] flex-col gap-[16px]"
      // Vor dem Anmelden einen evtl. noch vorhandenen Offline-Seiten-Cache
      // eines früheren Kontos leeren (Defense-in-Depth zum Logout-Clear, falls
      // die vorherige Sitzung nie sauber abgemeldet wurde) — siehe public/sw.js.
      onSubmit={() => clearServiceWorkerPageCache()}
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
        <PasswordInput
          id="password"
          name="password"
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

      <FormError message={state?.error} />

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

"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "./actions";

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
    <form
      action={formAction}
      className="flex max-w-[420px] flex-col gap-[16px]"
    >
      <div className="flex flex-col gap-[6px]">
        <label htmlFor="name" className="lcars-eyebrow">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={user.name}
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="email" className="lcars-eyebrow">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={user.email}
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
          Gespeichert.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-start disabled:opacity-50"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
    </form>
  );
}

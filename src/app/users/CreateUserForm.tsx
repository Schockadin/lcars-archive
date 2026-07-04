"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createUserAction, type AdminActionState } from "./actions";

const initialState: AdminActionState = {};

export default function CreateUserForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState,
  );

  // Bei Erfolg redirected die Action selbst (frische Userliste durch
  // Navigation). Nur wenn die Mail nicht gesendet werden konnte, bleibt die
  // Seite stehen (siehe manualActivationUrl) — die Liste darunter muss dann
  // manuell aktualisiert werden, damit der neue User dort auftaucht.
  useEffect(() => {
    if (state?.manualActivationUrl) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap gap-[12px] justify-between"
    >
      <div className="flex flex-col gap-[6px] flex-1">
        <label htmlFor="new-user-name" className="lcars-eyebrow">
          Name
        </label>
        <input
          id="new-user-name"
          name="name"
          type="text"
          required
          className="rounded-lcars-pill lcars-input flex-1"
        />
      </div>

      <div className="flex flex-col gap-[6px] flex-1">
        <label htmlFor="new-user-email" className="lcars-eyebrow">
          E-Mail
        </label>
        <input
          id="new-user-email"
          name="email"
          type="email"
          required
          className="rounded-lcars-pill lcars-input"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="new-user-role" className="lcars-eyebrow">
          Rolle
        </label>
        <select
          id="new-user-role"
          name="role"
          defaultValue="player"
          className="rounded-lcars-pill lcars-input"
        >
          <option value="admin">Administration</option>
          <option value="gm">Spielleitung</option>
          <option value="player">Spieler</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch disabled:opacity-50 w-[100%]"
      >
        {pending ? "Anlegen…" : "User anlegen"}
      </button>

      {state?.error && (
        <p className="w-full text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      {state?.warning && (
        <div className="w-full flex flex-col gap-[4px]">
          <p className="text-lcars-amber" role="alert">
            {state.warning}
          </p>
          {state.manualActivationUrl && (
            <input
              readOnly
              value={state.manualActivationUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-data outline-none"
            />
          )}
        </div>
      )}
    </form>
  );
}

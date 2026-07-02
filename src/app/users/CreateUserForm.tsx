"use client";

import { useActionState } from "react";
import { createUserAction, type AdminActionState } from "./actions";

const initialState: AdminActionState = {};

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-[12px]">
      <div className="flex flex-col gap-[6px]">
        <label htmlFor="new-user-name" className="lcars-eyebrow">
          Name
        </label>
        <input
          id="new-user-name"
          name="name"
          type="text"
          required
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="new-user-email" className="lcars-eyebrow">
          E-Mail-Adresse
        </label>
        <input
          id="new-user-email"
          name="email"
          type="email"
          required
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
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
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        >
          <option value="gm">Spielleitung</option>
          <option value="player">Spieler</option>
          <option value="viewer">Beobachter</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lcars-pill bg-lcars-amber px-[24px] py-[8px] font-lcars uppercase tracking-wide text-lcars-text-dark disabled:opacity-50"
      >
        {pending ? "Anlegen…" : "User anlegen"}
      </button>

      {state?.error && (
        <p className="w-full text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

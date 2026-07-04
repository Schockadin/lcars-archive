"use client";

import { useActionState } from "react";
import { updateUserDetailsAction, type EditUserState } from "./actions";
import type { UserAdminDetail } from "@/lib/users";

const initialState: EditUserState = {};

export default function EditUserForm({
  user,
  isSelf,
}: {
  user: UserAdminDetail;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserDetailsAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex max-w-[var(--lcars-content-w)] flex-col gap-[16px]"
    >
      <input type="hidden" name="userId" value={user.id} />

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="edit-user-name" className="lcars-eyebrow">
          Name
        </label>
        <input
          id="edit-user-name"
          name="name"
          type="text"
          required
          defaultValue={user.name}
          className="rounded-lcars-pill lcars-input"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="edit-user-email" className="lcars-eyebrow">
          E-Mail-Adresse
        </label>
        <input
          id="edit-user-email"
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className="rounded-lcars-pill lcars-input"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label htmlFor="edit-user-role" className="lcars-eyebrow">
          Rolle
        </label>
        <select
          id="edit-user-role"
          name="role"
          defaultValue={user.role}
          className="rounded-lcars-pill lcars-input"
        >
          <option value="admin">Administration</option>
          <option value="gm">Spielleitung</option>
          <option value="player">Spieler</option>
          <option value="viewer">Beobachter</option>
        </select>
        {isSelf && (
          <p className="text-lcars-text-dim">
            Du kannst dir nicht selbst die Admin-Rolle entziehen.
          </p>
        )}
      </div>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="lcars-switch self-end disabled:opacity-50 w-[100%]"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
    </form>
  );
}

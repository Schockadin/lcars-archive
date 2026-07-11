"use client";

import { useActionState } from "react";
import { updateUserDetailsAction, type EditUserState } from "./actions";
import type { UserAdminDetail } from "@/lib/users";
import {
  FormField,
  FormError,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

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

      <FormField label="Name" htmlFor="edit-user-name">
        <input
          id="edit-user-name"
          name="name"
          type="text"
          required
          defaultValue={user.name}
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="E-Mail-Adresse" htmlFor="edit-user-email">
        <input
          id="edit-user-email"
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="Rolle" htmlFor="edit-user-role">
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
          <option value="guest">Gast</option>
        </select>
        {isSelf && (
          <p className="text-lcars-text-dim">
            Du kannst dir nicht selbst die Admin-Rolle entziehen.
          </p>
        )}
      </FormField>

      <FormError message={state?.error} />

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        Speichern
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateUserDetailsAction, type EditUserState } from "./actions";
import type { UserAdminDetail } from "@/lib/users";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/permissions";
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
    <form action={formAction} className="flex flex-col gap-[16px]">
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

      <fieldset className="flex flex-col gap-[8px]">
        <legend className="lcars-eyebrow">Zusätzliche Rollen</legend>
        <p className="text-lcars-text-dim text-[13px]">
          Ein User kann mehrere Rollen haben — die effektiven Rechte sind die
          Vereinigung aller Rollen (die oben gewählte Primärrolle zählt immer
          dazu). Die einzelnen Rechte lassen sich darunter feinjustieren.
        </p>
        <div className="flex flex-col gap-[6px]">
          {ALL_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-[10px] lcars-eyebrow">
              <input
                type="checkbox"
                name="additionalRoles"
                value={r}
                defaultChecked={user.additional_roles.includes(r)}
                className="lcars-checkbox"
              />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

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

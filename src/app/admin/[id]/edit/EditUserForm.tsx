"use client";

import { useActionState } from "react";
import { updateUserDetailsAction, type EditUserState } from "./actions";
import type { UserAdminDetail } from "@/lib/users";
import { FormField, SaveFooter } from "@/app/_shared/FormPrimitives";

const initialState: EditUserState = {};

export interface RoleOption {
  key: string;
  label: string;
}

export default function EditUserForm({
  user,
  isSelf,
  roleOptions,
}: {
  user: UserAdminDetail;
  isSelf: boolean;
  // Alle wählbaren Rollen (System + eigene), aus der DB (siehe page.tsx).
  roleOptions: RoleOption[];
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
          className="lcars-input rounded-full"
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
          {roleOptions.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        {isSelf && (
          <p className="text-lcars-ink-dim">
            Du kannst dir nicht selbst die Admin-Rolle entziehen.
          </p>
        )}
      </FormField>

      <fieldset className="flex flex-col gap-[8px]">
        <legend className="lcars-eyebrow">Zusätzliche Rollen</legend>
        <p className="text-lcars-ink-dim text-[13px]">
          Ein User kann mehrere Rollen haben — die effektiven Rechte sind die
          Vereinigung aller Rollen (die oben gewählte Primärrolle zählt immer
          dazu). Die einzelnen Rechte lassen sich darunter feinjustieren.
        </p>
        <div className="flex flex-col gap-[6px]">
          {roleOptions.map((r) => (
            <label
              key={r.key}
              className="flex items-center gap-[10px] lcars-eyebrow"
            >
              <input
                type="checkbox"
                name="additionalRoles"
                value={r.key}
                defaultChecked={user.additional_roles.includes(r.key)}
                className="lcars-checkbox"
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

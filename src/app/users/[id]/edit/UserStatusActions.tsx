"use client";

import { useActionState } from "react";
import {
  deleteUserFromEditAction,
  setUserActiveAction,
  type EditUserState,
} from "./actions";
import type { UserAdminDetail } from "@/lib/users";
import { FormError } from "../../_shared/FormPrimitives";
import { DangerZoneButton } from "../../_shared/DangerZoneButton";

const initialState: EditUserState = {};

export default function UserStatusActions({
  user,
  isSelf,
}: {
  user: UserAdminDetail;
  isSelf: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    setUserActiveAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUserFromEditAction,
    initialState,
  );

  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-lcars-amber">Status</h2>

      <form action={statusAction} className="flex items-center gap-[12px]">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="active" value={String(!user.is_active)} />
        <span
          className={user.is_active ? "text-lcars-green" : "text-lcars-red"}
        >
          {user.is_active ? "Aktiv" : "Deaktiviert"}
        </span>
        <button
          type="submit"
          disabled={statusPending || isSelf}
          className="lcars-pill-btn--outline disabled:opacity-50"
          title={
            isSelf ? "Du kannst dich nicht selbst deaktivieren." : undefined
          }
        >
          {user.is_active ? "Deaktivieren" : "Reaktivieren"}
        </button>
      </form>
      <FormError message={statusState?.error} />

      <h2 className="text-lcars-red">Gefahrenzone</h2>
      <DangerZoneButton
        formAction={deleteAction}
        hiddenFields={{ userId: user.id }}
        pending={deletePending}
        disabled={isSelf}
        title={isSelf ? "Du kannst dich nicht selbst löschen." : undefined}
        confirmMessage={`${user.name} wirklich endgültig löschen? Das lässt sich nicht rückgängig machen.`}
        label="User löschen"
      />
      <FormError message={deleteState?.error} />
    </section>
  );
}

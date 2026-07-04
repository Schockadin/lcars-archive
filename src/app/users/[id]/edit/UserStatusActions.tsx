"use client";

import { useActionState } from "react";
import {
  deleteUserFromEditAction,
  setUserActiveAction,
  type EditUserState,
} from "./actions";
import type { UserAdminDetail } from "@/lib/users";

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
        <span className={user.is_active ? "text-lcars-green" : "text-lcars-red"}>
          {user.is_active ? "Aktiv" : "Deaktiviert"}
        </span>
        <button
          type="submit"
          disabled={statusPending || isSelf}
          className="lcars-switch disabled:opacity-50"
          title={isSelf ? "Du kannst dich nicht selbst deaktivieren." : undefined}
        >
          {user.is_active ? "Deaktivieren" : "Reaktivieren"}
        </button>
      </form>
      {statusState?.error && (
        <p className="text-lcars-red" role="alert">
          {statusState.error}
        </p>
      )}

      <h2 className="text-lcars-red">Gefahrenzone</h2>
      <form action={deleteAction}>
        <input type="hidden" name="userId" value={user.id} />
        <button
          type="submit"
          disabled={deletePending || isSelf}
          className="lcars-switch disabled:opacity-50"
          title={isSelf ? "Du kannst dich nicht selbst löschen." : undefined}
          onClick={(e) => {
            if (
              !confirm(
                `${user.name} wirklich endgültig löschen? Das lässt sich nicht rückgängig machen.`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          User löschen
        </button>
      </form>
      {deleteState?.error && (
        <p className="text-lcars-red" role="alert">
          {deleteState.error}
        </p>
      )}
    </section>
  );
}

"use client";

import { useActionState } from "react";
import {
  deleteUserFromEditAction,
  setUserActiveAction,
  type EditUserState,
} from "./actions";
import {
  resetUserPasswordAction,
  forceLogoutUserAction,
  type AdminActionState,
} from "../../actions";
import type { UserAdminDetail } from "@/lib/users";
import { FormError } from "@/app/_shared/FormPrimitives";
import { DangerZoneButton } from "@/app/_shared/DangerZoneButton";

const initialState: EditUserState = {};
const initialAdminActionState: AdminActionState = {};

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
  const [resetState, resetAction, resetPending] = useActionState(
    resetUserPasswordAction,
    initialAdminActionState,
  );
  const [logoutState, logoutAction, logoutPending] = useActionState(
    forceLogoutUserAction,
    initialAdminActionState,
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

      <form action={resetAction} className="flex items-center gap-[12px]">
        <input type="hidden" name="userId" value={user.id} />
        <button
          type="submit"
          disabled={resetPending}
          className="lcars-pill-btn--outline disabled:opacity-50"
        >
          Passwort zurücksetzen
        </button>
        {resetState?.sent && (
          <span className="text-lcars-text-data" role="status">
            Reset-Mail an {user.email} gesendet.
          </span>
        )}
      </form>
      <FormError message={resetState?.error} />
      {resetState?.warning && (
        <div className="flex flex-col gap-[4px]">
          <p className="text-lcars-amber" role="alert">
            {resetState.warning}
          </p>
          {resetState.manualActivationUrl && (
            <input
              readOnly
              value={resetState.manualActivationUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-data outline-none"
            />
          )}
        </div>
      )}

      <form action={logoutAction} className="flex items-center gap-[12px]">
        <input type="hidden" name="userId" value={user.id} />
        <button
          type="submit"
          disabled={logoutPending || isSelf}
          className="lcars-pill-btn--outline disabled:opacity-50"
          title={
            isSelf
              ? 'Nutze dafür deine eigenen Profil-Einstellungen ("Auf allen anderen Geräten abmelden").'
              : undefined
          }
        >
          Auf allen Geräten abmelden
        </button>
        {logoutState?.loggedOut && (
          <span className="text-lcars-text-data" role="status">
            {user.name} wurde auf allen Geräten abgemeldet.
          </span>
        )}
      </form>
      <FormError message={logoutState?.error} />

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

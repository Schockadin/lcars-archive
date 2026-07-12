"use client";

import { useActionState } from "react";
import {
  logoutEverywhereAction,
  type LogoutEverywhereState,
} from "./sessionActions";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";

const initialState: LogoutEverywhereState = {};

export default function LogoutEverywhereButton() {
  const [state, formAction, pending] = useActionState(
    logoutEverywhereAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <FormError message={state?.error} />
      {state?.success && (
        <FormSuccess>
          Alle anderen Sitzungen wurden abgemeldet. Diese Sitzung bleibt
          aktiv.
        </FormSuccess>
      )}
      <SubmitButton
        pending={pending}
        pendingLabel="Melde ab…"
        className="lcars-pill-btn--outline self-start"
      >
        Auf allen anderen Geräten abmelden
      </SubmitButton>
    </form>
  );
}

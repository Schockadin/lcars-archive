"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createUserAction, type AdminActionState } from "./actions";
import { FormField, FormError, SubmitButton } from "./_shared/FormPrimitives";

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
      <FormField label="Name" htmlFor="new-user-name" className="flex-1">
        <input
          id="new-user-name"
          name="name"
          type="text"
          required
          className="rounded-lcars-pill lcars-input flex-1"
        />
      </FormField>

      <FormField label="E-Mail" htmlFor="new-user-email" className="flex-1">
        <input
          id="new-user-email"
          name="email"
          type="email"
          required
          className="rounded-lcars-pill lcars-input"
        />
      </FormField>

      <FormField label="Rolle" htmlFor="new-user-role">
        <select
          id="new-user-role"
          name="role"
          defaultValue="player"
          className="rounded-lcars-pill lcars-input"
        >
          <option value="admin">Administration</option>
          <option value="gm">Spielleitung</option>
          <option value="player">Spieler</option>
          <option value="guest">Gast</option>
        </select>
      </FormField>

      <SubmitButton
        pending={pending}
        pendingLabel="Anlegen…"
        className="lcars-pill-btn--outline disabled:opacity-50 w-[100%]"
      >
        User anlegen
      </SubmitButton>

      <FormError message={state?.error} className="w-full" />

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

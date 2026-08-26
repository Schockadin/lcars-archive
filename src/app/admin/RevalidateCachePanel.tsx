"use client";
import { useActionState } from "react";
import {
  runRevalidateAction,
  type RevalidateActionState,
} from "./revalidateActions";

const initialState: RevalidateActionState = {};

// Admin-only (siehe page.tsx) — stößt POST /api/revalidate an, um die
// Inhalts-Caches (unstable_cache-Tags) manuell zu invalidieren, z.B. nach
// einem direkten DB-Eingriff außerhalb der App.
export default function RevalidateCachePanel() {
  const [state, formAction, pending] = useActionState(
    runRevalidateAction,
    initialState,
  );

  return (
    <form action={formAction} className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Invalidiert die serverseitigen Inhalts-Caches, damit Änderungen sofort
        sichtbar werden, statt bis zur nächsten automatischen Ablaufzeit zu
        warten.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Revalidate läuft" : "Revalidate Cache"}
      </button>

      {state?.error && (
        <p className="text-lcars-quinary" role="alert">
          {state.error}
        </p>
      )}

      {state?.tags && (
        <p className="text-lcars-primary">
          Cache invalidiert: {state.tags.length ? state.tags.join(", ") : "—"}
        </p>
      )}
    </form>
  );
}

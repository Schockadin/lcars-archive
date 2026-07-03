"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateUserRoleAction, type AdminActionState } from "./actions";
import type { UserWithCharacters } from "@/lib/users";

const initialState: AdminActionState = {};

export default function UserRoleRow({ user }: { user: UserWithCharacters }) {
  const [state, formAction, pending] = useActionState(
    updateUserRoleAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-lcars-border pb-[12px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        <span className="font-lcars text-lcars-text-data">{user.name}</span>
        <span className="text-lcars-text">{user.email}</span>
        {user.characters.length > 0 && (
          <span className="flex flex-wrap gap-[6px]">
            {user.characters.map((c) => (
              <Link
                key={c.id}
                href={`/characters/${c.slug}`}
                className="text-lcars-amber underline"
              >
                {c.name}
              </Link>
            ))}
          </span>
        )}
      </div>

      <form action={formAction} className="flex items-center gap-[8px]">
        <input type="hidden" name="userId" value={user.id} />
        <select
          name="role"
          defaultValue={user.role}
          className="rounded-lcars-pill lcars-input"
        >
          <option value="gm">Spielleitung</option>
          <option value="player">Spieler</option>
          <option value="viewer">Beobachter</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="lcars-switch disabled:opacity-50"
        >
          Speichern
        </button>
      </form>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

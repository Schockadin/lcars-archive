"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import {
  updateUserRoleAction,
  updateUserProfileAction,
  deactivateUserAction,
  reactivateUserAction,
  deleteUserAction,
  type AdminActionState,
} from "./actions";
import type { UserWithCharacters } from "@/lib/users";

const initialState: AdminActionState = {};

const ROLE_LABELS: Record<UserWithCharacters["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
};

export default function UserRoleRow({
  user,
  isAdmin,
}: {
  user: UserWithCharacters;
  isAdmin: boolean;
}) {
  const [editingProfile, setEditingProfile] = useState(false);

  const [roleState, roleAction, rolePending] = useActionState(
    updateUserRoleAction,
    initialState,
  );
  const [profileState, profileAction, profilePending] = useActionState(
    updateUserProfileAction,
    initialState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    user.is_active ? deactivateUserAction : reactivateUserAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUserAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-lcars-border pb-[12px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        <span className="font-lcars text-lcars-text-data">{user.name}</span>
        <span className="text-lcars-text-dim">{user.email}</span>
        {!user.is_active && <span className="text-lcars-red">Deaktiviert</span>}
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

      {!isAdmin ? (
        <span className="text-lcars-text-dim">{ROLE_LABELS[user.role]}</span>
      ) : (
        <>
          <form action={roleAction} className="flex items-center gap-[8px]">
            <input type="hidden" name="userId" value={user.id} />
            <select
              name="role"
              defaultValue={user.role}
              className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[12px] py-[4px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
            >
              <option value="admin">Administration</option>
              <option value="gm">Spielleitung</option>
              <option value="player">Spieler</option>
              <option value="viewer">Beobachter</option>
            </select>
            <button
              type="submit"
              disabled={rolePending}
              className="lcars-switch disabled:opacity-50"
            >
              Speichern
            </button>
          </form>
          {roleState?.error && (
            <p className="text-lcars-red" role="alert">
              {roleState.error}
            </p>
          )}

          {editingProfile ? (
            <form
              action={profileAction}
              className="flex flex-wrap items-center gap-[8px]"
            >
              <input type="hidden" name="userId" value={user.id} />
              <input
                name="name"
                type="text"
                defaultValue={user.name}
                className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[12px] py-[4px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
              />
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[12px] py-[4px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
              />
              <button
                type="submit"
                disabled={profilePending}
                className="lcars-switch disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                className="lcars-switch"
                onClick={() => setEditingProfile(false)}
              >
                Abbrechen
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-[8px]">
              <button
                type="button"
                className="lcars-switch"
                onClick={() => setEditingProfile(true)}
              >
                Bearbeiten
              </button>

              <form action={statusAction}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  disabled={statusPending}
                  className="lcars-switch disabled:opacity-50"
                >
                  {user.is_active ? "Deaktivieren" : "Reaktivieren"}
                </button>
              </form>

              <form action={deleteAction}>
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  disabled={deletePending}
                  className="lcars-switch disabled:opacity-50"
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
                  Löschen
                </button>
              </form>
            </div>
          )}
          {profileState?.error && (
            <p className="text-lcars-red" role="alert">
              {profileState.error}
            </p>
          )}
          {statusState?.error && (
            <p className="text-lcars-red" role="alert">
              {statusState.error}
            </p>
          )}
          {deleteState?.error && (
            <p className="text-lcars-red" role="alert">
              {deleteState.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

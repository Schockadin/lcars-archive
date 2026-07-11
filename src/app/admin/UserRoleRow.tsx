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
  resetUserPasswordAction,
  type AdminActionState,
} from "./actions";
import type { UserWithCharacters } from "@/lib/users";
import {
  CheckIcon,
  XIcon,
  PencilIcon,
  BanIcon,
  RestoreIcon,
  TrashIcon,
  KeyIcon,
} from "@/lib/icons";

const initialState: AdminActionState = {};

const ROLE_LABELS: Record<UserWithCharacters["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
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
  const [resetState, resetAction, resetPending] = useActionState(
    resetUserPasswordAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-lcars-border pb-[12px]">
      <div className="flex flex-wrap items-center gap-[12px]">
        {isAdmin ? (
          <Link
            href={`/admin/${user.id}/edit`}
            className="font-lcars text-lcars-text-data underline"
          >
            {user.name}
          </Link>
        ) : (
          <span className="font-lcars text-lcars-text-data">{user.name}</span>
        )}
        <span className="text-lcars-text">{user.email}</span>
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
          <div className="flex flex-wrap gap-[16px] items-center">
            <span className="text-lcars-text-dim">Rolle:</span>
            <form
              action={roleAction}
              className="flex flex-wrap items-center gap-[8px]"
            >
              <input type="hidden" name="userId" value={user.id} />
              <select
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
              <button
                type="submit"
                disabled={rolePending}
                className="lcars-icon-btn"
                aria-label="Speichern"
                title="Speichern"
              >
                <CheckIcon />
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
                  className="rounded-lcars-pill lcars-input"
                />
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  className="rounded-lcars-pill lcars-input"
                />
                <button
                  type="submit"
                  disabled={profilePending}
                  className="lcars-icon-btn"
                  aria-label="Speichern"
                  title="Speichern"
                >
                  <CheckIcon />
                </button>
                <button
                  type="button"
                  className="lcars-icon-btn"
                  aria-label="Abbrechen"
                  title="Abbrechen"
                  onClick={() => setEditingProfile(false)}
                >
                  <XIcon />
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-[8px]">
                <button
                  type="button"
                  className="lcars-icon-btn"
                  aria-label="Bearbeiten"
                  title="Bearbeiten"
                  onClick={() => setEditingProfile(true)}
                >
                  <PencilIcon />
                </button>

                <form action={statusAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    disabled={statusPending}
                    className="lcars-icon-btn"
                    aria-label={
                      user.is_active ? "Deaktivieren" : "Reaktivieren"
                    }
                    title={user.is_active ? "Deaktivieren" : "Reaktivieren"}
                  >
                    {user.is_active ? <BanIcon /> : <RestoreIcon />}
                  </button>
                </form>

                <form action={resetAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    disabled={resetPending}
                    className="lcars-icon-btn"
                    aria-label="Passwort zurücksetzen"
                    title="Passwort zurücksetzen"
                  >
                    <KeyIcon />
                  </button>
                </form>

                <form action={deleteAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    disabled={deletePending}
                    className="lcars-icon-btn lcars-icon-btn--danger"
                    aria-label="Löschen"
                    title="Löschen"
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
                    <TrashIcon />
                  </button>
                </form>
              </div>
            )}
          </div>
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
          {resetState?.error && (
            <p className="text-lcars-red" role="alert">
              {resetState.error}
            </p>
          )}
          {resetState?.sent && (
            <p className="text-lcars-text-data" role="status">
              Reset-Mail an {user.email} gesendet.
            </p>
          )}
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
        </>
      )}
    </div>
  );
}

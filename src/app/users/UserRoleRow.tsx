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

// Inline-SVGs statt Icon-Bibliothek (kein lucide-react/heroicons im Repo) —
// gleiches Muster wie das Such-Icon in HeaderSearch.tsx (stroke="currentColor",
// erbt die Textfarbe des umgebenden .lcars-icon-btn).
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CheckIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M16.86 4.49a2.1 2.1 0 1 1 2.97 2.97L7.5 19.79l-4 1 1-4L16.86 4.49Z" />
    </svg>
  );
}
function BanIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11" />
    </svg>
  );
}
function RestoreIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 4v5h5M4.6 15a8 8 0 1 0 1-9.4L4 9" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}

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
        {isAdmin ? (
          <Link
            href={`/users/${user.id}/edit`}
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
          <div className="flex gap-[16px] items-center">
            <span className="text-lcars-text-dim">Rolle:</span>
            <form action={roleAction} className="flex items-center gap-[8px]">
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
        </>
      )}
    </div>
  );
}

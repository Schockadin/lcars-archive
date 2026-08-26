"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  updateRoleMetaAction,
  deleteRoleAction,
  updateRoleMembersAction,
  type RolesState,
} from "./actions";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";

const initialState: RolesState = {};

export interface RoleMember {
  id: number;
  name: string;
  email: string;
  isMember: boolean;
  isPrimary: boolean;
}

export interface EditableRole {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

// Ein aufklappbarer Editor pro Rolle: Name/Beschreibung bearbeiten, Mitglieder
// verwalten und (nur eigene Rollen) löschen. Die RECHTE einer Rolle werden nicht
// mehr hier gesetzt, sondern zentral in der Rechte-Matrix oben (PermissionsMatrix
// → updateRolePermissionsAction).
export default function RoleEditor({
  role,
  members,
}: {
  role: EditableRole;
  members: RoleMember[];
}) {
  const [editState, editAction, editing] = useActionState(
    updateRoleMetaAction,
    initialState,
  );
  const [deleteState, deleteFormAction, deleting] = useActionState(
    deleteRoleAction,
    initialState,
  );
  const [membersState, membersAction, savingMembers] = useActionState(
    updateRoleMembersAction,
    initialState,
  );
  // Mitglieder-Suchfilter: blendet nicht passende Zeilen nur AUS (CSS hidden),
  // entfernt sie NICHT aus dem DOM — sonst würden angehakte, aber gerade
  // ausgefilterte Mitglieder beim Speichern als „nicht mehr Mitglied" gewertet.
  const [memberQuery, setMemberQuery] = useState("");
  const q = memberQuery.trim().toLowerCase();

  return (
    <details className="lcars-panel p-[16px] flex flex-col gap-[12px]">
      <summary className="cursor-pointer flex items-center gap-[10px]">
        <span className="lcars-eyebrow text-lcars-primary">{role.label}</span>
        <span className="text-lcars-text-dim text-[12px]">
          {role.is_system ? "System-Rolle" : "Eigene Rolle"} · Schlüssel{" "}
          <code>{role.key}</code> · {role.permissions.length} Rechte ·{" "}
          {members.filter((m) => m.isMember).length} Mitglieder
        </span>
      </summary>

      <div className="flex flex-col gap-[24px] mt-[12px]">
        {/* Name/Beschreibung (Rechte → Rechte-Matrix oben) */}
        <form action={editAction} className="flex flex-col gap-[12px]">
          <input type="hidden" name="key" value={role.key} />

          <div className="flex flex-col gap-[6px]">
            <label className="lcars-eyebrow" htmlFor={`label-${role.key}`}>
              Name
            </label>
            <input
              id={`label-${role.key}`}
              name="label"
              type="text"
              required
              defaultValue={role.label}
              className="rounded-lcars-pill lcars-input"
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="lcars-eyebrow" htmlFor={`desc-${role.key}`}>
              Beschreibung
            </label>
            <input
              id={`desc-${role.key}`}
              name="description"
              type="text"
              defaultValue={role.description}
              className="rounded-lcars-pill lcars-input"
            />
          </div>

          <FormError message={editState?.error} />
          {editState?.success && <FormSuccess>Gespeichert.</FormSuccess>}

          <SubmitButton
            pending={editing}
            pendingLabel="Speichern…"
            className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
          >
            Name speichern
          </SubmitButton>
        </form>

        {/* Mitglieder */}
        <form action={membersAction} className="flex flex-col gap-[8px]">
          <input type="hidden" name="key" value={role.key} />
          <p className="lcars-eyebrow">Mitglieder</p>
          <p className="text-lcars-text-dim text-[12px]">
            Angehakt = User hat diese Rolle (als Zusatzrolle). Wer sie als
            Primärrolle hat, ist fest Mitglied — das ändert sich im{" "}
            <Link href="/admin/users" className="underline">
              User-Editor
            </Link>
            .
          </p>
          {members.length > 8 && (
            <input
              type="search"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Mitglieder filtern (Name/E-Mail)…"
              aria-label="Mitglieder filtern"
              className="rounded-lcars-pill lcars-input"
            />
          )}
          <div className="flex flex-col gap-[6px]">
            {members.map((m) => {
              const matches =
                q === "" ||
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q);
              return (
                <label
                  key={m.id}
                  className={
                    matches ? "flex items-center gap-[10px]" : "hidden"
                  }
                >
                  <input
                    type="checkbox"
                    name="members"
                    value={m.id}
                    defaultChecked={m.isMember}
                    disabled={m.isPrimary}
                    className="lcars-checkbox"
                  />
                  <span
                    className={
                      m.isPrimary
                        ? "text-lcars-text-dim"
                        : "text-lcars-text-data"
                    }
                  >
                    {m.name}{" "}
                    <span className="text-lcars-text-dim text-[12px]">
                      &lt;{m.email}&gt;{m.isPrimary ? " · Primärrolle" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <FormError message={membersState?.error} />
          {membersState?.success && (
            <FormSuccess>Mitglieder gespeichert.</FormSuccess>
          )}

          <SubmitButton
            pending={savingMembers}
            pendingLabel="Speichern…"
            className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
          >
            Mitglieder speichern
          </SubmitButton>
        </form>

        {/* Löschen (nur eigene Rollen) */}
        {!role.is_system && (
          <form action={deleteFormAction} className="flex flex-col gap-[8px]">
            <input type="hidden" name="key" value={role.key} />
            <FormError message={deleteState?.error} />
            <SubmitButton
              pending={deleting}
              pendingLabel="Löschen…"
              onClick={confirmSubmit(
                `Rolle „${role.label}" wirklich löschen? Das lässt sich nicht rückgängig machen.`,
              )}
              className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%] bg-lcars-quinary text-black"
            >
              Rolle löschen
            </SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}

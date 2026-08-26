"use client";

import { useActionState } from "react";
import { updateUserPermissionsAction, type EditUserState } from "./actions";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  rolePermissions,
  resolvePermissions,
  type Role,
  type RoleMap,
} from "@/lib/permissions";
import { FormError, SubmitButton } from "@/app/_shared/FormPrimitives";

const initialState: EditUserState = {};

// Individueller Rechte-Editor: zeigt pro Recht den EFFEKTIVEN Zustand (aus den
// Rollen + bestehenden Overrides). Beim Speichern wird nur die Abweichung vom
// Rollen-Default als Override gespeichert (siehe updateUserPermissionsAction) —
// die Anzeige „von Rolle geerbt“ vs. „überschrieben“ macht das transparent.
export default function PermissionsForm({
  userId,
  roles,
  overrides,
  roleMap,
}: {
  userId: number;
  // Effektive Rollen des Users (Primär + Zusatz).
  roles: Role[];
  overrides: Record<string, boolean>;
  // Rollen→Rechte-Definitionen (aus der DB, siehe page.tsx) — nötig, weil die
  // Client-Komponente die prozessweite aktive Map des Servers nicht kennt und
  // eigene/bearbeitete Rollen sonst falsch „geerbt“ anzeigen würde.
  roleMap: RoleMap;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserPermissionsAction,
    initialState,
  );

  const inherited = rolePermissions(roles, roleMap);
  const effective = resolvePermissions(roles, overrides, roleMap);

  return (
    <form action={formAction} className="flex flex-col gap-[12px]">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-lcars-ink-dim text-[13px]">
        Häkchen = Recht ist wirksam. Weicht es vom Rollen-Default ab, wird es als
        individuelles Override gespeichert; stimmt es wieder mit den Rollen
        überein, wird das Override entfernt.
      </p>

      <div className="flex flex-col gap-[8px]">
        {PERMISSIONS.map((perm) => {
          const isInherited = inherited.has(perm);
          const isEffective = effective.has(perm);
          const isOverridden = isEffective !== isInherited;
          return (
            <label key={perm} className="flex items-start gap-[10px]">
              <input
                type="checkbox"
                name="permissions"
                value={perm}
                defaultChecked={isEffective}
                className="lcars-checkbox mt-[3px]"
              />
              <span className="flex flex-col">
                <span className="lcars-eyebrow">
                  {PERMISSION_LABELS[perm].label}{" "}
                  <span className="text-lcars-ink-dim">
                    ({isOverridden
                      ? isEffective
                        ? "überschrieben: gewährt"
                        : "überschrieben: entzogen"
                      : isInherited
                        ? "von Rolle geerbt"
                        : "nicht in Rolle"}
                    )
                  </span>
                </span>
                <span className="text-lcars-ink-dim text-[12px]">
                  {PERMISSION_LABELS[perm].description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <FormError message={state?.error} />

      <SubmitButton
        pending={pending}
        pendingLabel="Speichern…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50 w-[100%]"
      >
        Rechte speichern
      </SubmitButton>
    </form>
  );
}

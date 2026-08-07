"use client";
import { useState, useTransition } from "react";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  type Permission,
} from "@/lib/permissions";
import { updateRolePermissionsAction, deleteRoleAction } from "./actions";
import { useToast } from "@/components/toast/ToastProvider";

export interface MatrixRole {
  key: string;
  label: string;
  is_system: boolean;
  permissions: string[];
  memberCount: number;
}

const KNOWN = new Set(PERMISSIONS as readonly string[]);
const serialize = (perms: Iterable<Permission>) =>
  [...perms].sort().join(",");

// Rechte-Matrix: Rollen als Spalten, Funktionsbereich-Rechte als Zeilen, jede
// Zelle eine Checkbox. Pro Spalte (Rolle) gibt es einen „Speichern"-Knopf, der
// nur bei ungespeicherten Änderungen aktiv ist und die Rechte dieser Rolle über
// updateRolePermissionsAction schreibt; eigene Rollen lassen sich in der
// Kopfzeile auch löschen. Name/Beschreibung/Mitglieder werden weiterhin unter
// der Matrix je Rolle bearbeitet (RoleEditor).
export default function PermissionsMatrix({ roles }: { roles: MatrixRole[] }) {
  const { showToast } = useToast();
  const [grants, setGrants] = useState<Record<string, Set<Permission>>>(() => {
    const init: Record<string, Set<Permission>> = {};
    for (const r of roles) {
      init[r.key] = new Set(
        r.permissions.filter((p): p is Permission => KNOWN.has(p)),
      );
    }
    return init;
  });
  // Serialisierter Ausgangszustand je Rolle → „dirty", wenn abweichend.
  const [baseline, setBaseline] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of roles) {
      init[r.key] = serialize(
        r.permissions.filter((p): p is Permission => KNOWN.has(p)),
      );
    }
    return init;
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isDirty = (key: string) => serialize(grants[key]) !== baseline[key];

  function toggle(key: string, perm: Permission) {
    setGrants((prev) => {
      const next = new Set(prev[key]);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...prev, [key]: next };
    });
  }

  function save(role: MatrixRole) {
    const snapshot = serialize(grants[role.key]);
    const fd = new FormData();
    fd.set("key", role.key);
    for (const p of grants[role.key]) fd.append("permissions", p);
    setPendingKey(role.key);
    startTransition(async () => {
      const res = await updateRolePermissionsAction({}, fd);
      setPendingKey(null);
      if (res.error) {
        showToast(res.error, { kind: "error" });
      } else {
        showToast(`Rechte für „${role.label}“ gespeichert.`, {
          kind: "success",
        });
        setBaseline((b) => ({ ...b, [role.key]: snapshot }));
      }
    });
  }

  function remove(role: MatrixRole) {
    if (
      !confirm(
        `Rolle „${role.label}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("key", role.key);
    setPendingKey(role.key);
    startTransition(async () => {
      const res = await deleteRoleAction({}, fd);
      setPendingKey(null);
      if (res.error) showToast(res.error, { kind: "error" });
      else showToast(`Rolle „${role.label}“ gelöscht.`, { kind: "success" });
    });
  }

  return (
    // Eigenständige Scroll-Box (beide Achsen) — so ist der Scrollport für die
    // sticky Kopfzeile (top:0) UND die sticky erste Spalte (left:0) exakt dieser
    // Container. Ohne die gebundene Höhe stickt die Kopfzeile am (vertikal
    // scrollenden) Seiten-Container, während der horizontale Scroll im inneren
    // overflow-Div passiert — beide liefen auf Mobilgeräten auseinander (nur die
    // Kopfzeile bewegte sich beim horizontalen Wischen).
    <div className="lcars-perm-matrix-scroll">
      <table className="lcars-perm-matrix">
        <thead>
          <tr>
            <th className="lcars-perm-matrix-corner" scope="col">
              Recht
            </th>
            {roles.map((role) => (
              <th key={role.key} scope="col">
                <div className="flex flex-col items-center gap-[4px]">
                  <span className="text-lcars-amber font-bold">
                    {role.label}
                  </span>
                  <span className="text-lcars-text-dim text-[11px] font-normal normal-case">
                    {role.is_system ? "System" : "Eigen"} · {role.memberCount}{" "}
                    Mitgl.
                  </span>
                  <div className="flex gap-[4px]">
                    <button
                      type="button"
                      onClick={() => save(role)}
                      disabled={!isDirty(role.key) || pendingKey === role.key}
                      className="rounded-full px-[10px] py-[2px] text-[11px] bg-lcars-amber text-black font-bold disabled:opacity-40"
                    >
                      {pendingKey === role.key ? "…" : "Speichern"}
                    </button>
                    {!role.is_system && (
                      <button
                        type="button"
                        onClick={() => remove(role)}
                        disabled={pendingKey === role.key}
                        className="rounded-full px-[10px] py-[2px] text-[11px] bg-lcars-red text-black font-bold disabled:opacity-40"
                        title="Rolle löschen"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(PERMISSIONS as readonly Permission[]).map((perm) => (
            <tr key={perm}>
              <th scope="row" className="lcars-perm-matrix-row">
                <span className="block text-lcars-text-data">
                  {PERMISSION_LABELS[perm].label}
                </span>
                <span
                  className="block text-lcars-text-dim text-[11px] font-normal normal-case"
                  title={PERMISSION_LABELS[perm].description}
                >
                  {PERMISSION_LABELS[perm].description}
                </span>
              </th>
              {roles.map((role) => (
                <td key={role.key} className="text-center">
                  <input
                    type="checkbox"
                    checked={grants[role.key].has(perm)}
                    onChange={() => toggle(role.key, perm)}
                    aria-label={`${PERMISSION_LABELS[perm].label} für ${role.label}`}
                    className="lcars-checkbox"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

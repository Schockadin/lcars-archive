import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requirePermission } from "@/lib/dal";
import { listRolesForAdmin } from "@/lib/roles";
import { listAllUsers } from "@/lib/users";
import CreateRoleForm from "./CreateRoleForm";
import RoleEditor, { type RoleMember } from "./RoleEditor";
import PermissionsMatrix, { type MatrixRole } from "./PermissionsMatrix";

export const metadata: Metadata = {
  title: "Rollen & Rechte",
  robots: { index: false, follow: false },
};

// Rollen-Editor: Rollen anlegen/bearbeiten und Usern zuweisen. Rechte-Verwaltung
// = Nutzerverwaltung, daher wie diese auf users.manage gegatet (Admin-Ebene),
// zusätzlich zum requireStaff-Gate des /admin-Layouts.
export default async function PermissionsAdminPage() {
  await requirePermission("users.manage");

  const [roles, users] = await Promise.all([
    listRolesForAdmin(),
    listAllUsers(),
  ]);

  // Mitglieder je Rolle einmal vorbereiten — von Matrix (Mitgliederzahl in der
  // Spaltenüberschrift) und RoleEditor (Mitgliederverwaltung) gemeinsam genutzt.
  const membersByRole = new Map<string, RoleMember[]>(
    roles.map((role) => [
      role.key,
      users.map((u) => {
        const isPrimary = u.role === role.key;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          isPrimary,
          isMember: isPrimary || u.additional_roles.includes(role.key),
        };
      }),
    ]),
  );

  const matrixRoles: MatrixRole[] = roles.map((role) => ({
    key: role.key,
    label: role.label,
    is_system: role.is_system,
    permissions: role.permissions,
    memberCount: (membersByRole.get(role.key) ?? []).filter((m) => m.isMember)
      .length,
  }));

  // key hängt an der Rollen-Signatur (Schlüssel + Rechte), damit die Matrix nach
  // dem Anlegen/Löschen einer Rolle oder gespeicherten Rechten frisch mit dem
  // Server-Stand remountet statt lokal veralteten State zu behalten.
  const matrixKey = matrixRoles
    .map((r) => `${r.key}:${r.permissions.length}`)
    .join("|");

  return (
    <>
      <PageMeta title="Rollen & Rechte" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Rollen &amp; Rechte</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[8px]">
            <p className="text-lcars-ink-dim">
              Rollen bündeln Rechte. Ein User kann mehrere Rollen haben; die
              effektiven Rechte sind die Vereinigung aller Rollen und lassen
              sich pro User zusätzlich im User-Editor feinjustieren.
              System-Rollen sind inhaltlich bearbeitbar, aber nicht löschbar.
            </p>
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Rechte-Matrix</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Zeilen = Rechte, Spalten = Rollen. Haken setzen/entfernen und pro
              Spalte mit <b>Speichern</b> übernehmen (nur bei ungespeicherten
              Änderungen aktiv). Name, Beschreibung und Mitglieder einer Rolle
              werden darunter je Rolle bearbeitet.
            </p>
            <PermissionsMatrix key={matrixKey} roles={matrixRoles} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">
              Name, Beschreibung &amp; Mitglieder
            </h2>
            <div className="flex flex-col gap-[12px]">
              {roles.map((role) => (
                <RoleEditor
                  key={role.key}
                  role={{
                    key: role.key,
                    label: role.label,
                    description: role.description,
                    permissions: role.permissions,
                    is_system: role.is_system,
                  }}
                  members={membersByRole.get(role.key) ?? []}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Neue Rolle anlegen</h2>
            <CreateRoleForm />
          </section>
        </div>
      </article>
    </>
  );
}

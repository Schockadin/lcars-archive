import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requirePermission } from "@/lib/dal";
import { listRolesForAdmin } from "@/lib/roles";
import { listAllUsers } from "@/lib/users";
import CreateRoleForm from "./CreateRoleForm";
import RoleEditor, { type RoleMember } from "./RoleEditor";

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

  return (
    <>
      <PageMeta title="Rollen & Rechte" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Rollen &amp; Rechte</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[8px]">
            <p className="text-lcars-text-dim">
              Rollen bündeln Rechte. Ein User kann mehrere Rollen haben; die
              effektiven Rechte sind die Vereinigung aller Rollen und lassen sich
              pro User zusätzlich im User-Editor feinjustieren. System-Rollen sind
              inhaltlich bearbeitbar, aber nicht löschbar.
            </p>
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Rollen</h2>
            <div className="flex flex-col gap-[12px]">
              {roles.map((role) => {
                const members: RoleMember[] = users.map((u) => {
                  const isPrimary = u.role === role.key;
                  return {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    isPrimary,
                    isMember:
                      isPrimary || u.additional_roles.includes(role.key),
                  };
                });
                return (
                  <RoleEditor
                    key={role.key}
                    role={{
                      key: role.key,
                      label: role.label,
                      description: role.description,
                      permissions: role.permissions,
                      is_system: role.is_system,
                    }}
                    members={members}
                  />
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Neue Rolle anlegen</h2>
            <CreateRoleForm />
          </section>
        </div>
      </article>
    </>
  );
}

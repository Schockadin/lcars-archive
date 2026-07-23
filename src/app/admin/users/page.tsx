import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import CreateUserForm from "../CreateUserForm";
import UserBackupPanel from "../UserBackupPanel";
import AdminUsersTable from "./AdminUsersTable";

export const metadata: Metadata = {
  title: "User",
  robots: { index: false, follow: false },
};

// Erhöht das Server-Action-Timeout dieser Seite (siehe gleicher Kommentar im
// früheren admin/page.tsx) — u.a. für den User-Backup-Export/-Import.
export const maxDuration = 60;

// Admin-only: neuen User anlegen, tabellarische Übersicht (inkl. Login-/
// Besuchs-Zeitstempel), User-Backup. Die Zeilenaktionen pro User (Rolle,
// (de)aktivieren, löschen, Passwort-Reset, Force-Logout) liegen gebündelt
// auf /admin/[id]/edit ("Verwalten"-Link in der Tabelle).
export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listAllUsers();

  return (
    <>
      <PageMeta title="User" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Nutzerverwaltung</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Neuen User anlegen</h2>
            <CreateUserForm />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">
              {users.length} registrierte User
            </h2>
            <AdminUsersTable users={users} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">User-Backup</h2>
            <UserBackupPanel />
          </section>
        </div>
      </article>
    </>
  );
}

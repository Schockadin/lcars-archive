import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import CreateUserForm from "./CreateUserForm";
import UserManagementTable from "./UserManagementTable";
import CharacterAssignmentTable from "./CharacterAssignmentTable";

export const metadata: Metadata = {
  title: "Nutzerverwaltung",
  robots: { index: false, follow: false },
};

// Gm-oder-admin — kein Sidebar-Eintrag, gleiches Prinzip wie /login.
// requireGM() leitet Nicht-Privilegierte auf ihre eigene /users/<id> um.
// Useraccount-Verwaltung (anlegen/Rolle/Deaktivieren/Löschen/Bearbeiten UND
// die reine Übersicht "registrierte User") ist admin-only und wird für
// einen reinen gm komplett ausgeblendet — die Seite zeigt einem gm dann nur
// noch die Charakter-Zuordnung (Nav-Label für gm entsprechend "Leitung",
// siehe HeaderUserNav.tsx).
export default async function UsersAdminPage() {
  const viewer = await requireGM();
  const isAdmin = viewer.role === "admin";

  const [users, characters] = await Promise.all([
    listAllUsers(),
    getAllCharactersForAdmin(),
  ]);
  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Nutzerverwaltung" section="users" />
      <article className="mb-[10px] max-w-[800px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>{isAdmin ? "Nutzerverwaltung" : "Charaktere zuordnen"}</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          {isAdmin && (
            <section className="flex flex-col gap-[12px]">
              <h2 className="text-lcars-amber">Neuen User anlegen</h2>
              <CreateUserForm />
            </section>
          )}

          {isAdmin && (
            <section className="flex flex-col gap-[12px]">
              <h2 className="text-lcars-amber">
                {users.length} registrierte User
              </h2>
              <UserManagementTable users={users} isAdmin={isAdmin} />
            </section>
          )}

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Charaktere zuordnen</h2>
            <CharacterAssignmentTable
              characters={characters}
              users={userOptions}
            />
          </section>
        </div>
      </article>
    </>
  );
}

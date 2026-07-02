import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharacters } from "@/lib/characters";
import CreateUserForm from "./CreateUserForm";
import UserManagementTable from "./UserManagementTable";
import CharacterAssignmentTable from "./CharacterAssignmentTable";

export const metadata: Metadata = {
  title: "Nutzerverwaltung",
  robots: { index: false, follow: false },
};

// GM-only — kein Sidebar-Eintrag, gleiches Prinzip wie /login. requireGM()
// leitet Nicht-GMs auf ihre eigene /users/<id> um.
export default async function UsersAdminPage() {
  await requireGM();

  const [users, characters] = await Promise.all([
    listAllUsers(),
    getAllCharacters(),
  ]);
  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Nutzerverwaltung" section="users" />
      <article className="mb-[10px] max-w-[800px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Nutzerverwaltung</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <p className="lcars-eyebrow">Neuen User anlegen</p>
            <CreateUserForm />
          </section>

          <section className="flex flex-col gap-[12px]">
            <p className="lcars-eyebrow">{users.length} registrierte User</p>
            <UserManagementTable users={users} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <p className="lcars-eyebrow">Charaktere zuordnen</p>
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

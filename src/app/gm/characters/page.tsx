import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import CharacterAssignmentTable from "../CharacterAssignmentTable";

export const metadata: Metadata = {
  title: "Charaktere zuordnen",
  robots: { index: false, follow: false },
};

// Gm-oder-admin — einzige Admin-Unterseite, die auch ein reiner gm sehen darf
// (Nav-Label entsprechend "Leitung" statt "Admin", siehe HeaderUserNav.tsx).
export default async function AdminCharactersPage() {
  await requireGM();

  const [users, characters] = await Promise.all([
    listAllUsers(),
    getAllCharactersForAdmin(),
  ]);
  // Gäste dürfen keinen Charakter zugewiesen bekommen (siehe
  // assignCharacterAction in ../actions.ts, das dieselbe Regel serverseitig
  // durchsetzt) — sie fehlen deshalb schon hier in der Auswahl.
  const roleMap = await getRoleMap();
  const userOptions = users
    .filter((u) => userCan(u, "characters.assignable", roleMap))
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Charaktere" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Charaktere zuordnen</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <CharacterAssignmentTable
            characters={characters}
            users={userOptions}
          />
        </div>
      </article>
    </>
  );
}

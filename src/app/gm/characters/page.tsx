import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import CharacterAssignmentTable from "../CharacterAssignmentTable";
import CreationResetTable, {
  type CreationStateRow,
} from "./CreationResetTable";
import { parseCharacterStats } from "@/lib/characterStats";

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

  // Erschaffungs-Status je Charakter. Die Werte liegen roh in metadata.stats
  // und werden wie überall über parseCharacterStats gelesen; an die
  // Client-Komponente gehen nur die Angaben, die die Tabelle zeigt — der ganze
  // Wertesatz wäre unnötiger Ballast im Bundle.
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const creationRows: CreationStateRow[] = characters.map((character) => {
    const stats = parseCharacterStats(character.metadata.stats);
    return {
      id: character.id,
      name: character.name,
      playerName: character.player_id
        ? (nameById.get(character.player_id) ?? null)
        : null,
      creationLocked: stats.creationLocked,
      pending: stats.pendingAdvancements,
    };
  });

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

      <article className="mb-[10px] lcars-wide-column">
        <h2>Erschaffung</h2>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Ein abgeschlossener Bogen lässt sich zurück in die Erschaffung
            schicken — etwa, wenn sich die Runde auf andere Startwerte einigt.
            Alle Steigerungen seit dem Abschluss werden dabei zurückgenommen:
            die Werte fallen auf den Stand der Erschaffung, die AP kommen aufs
            Konto zurück. Was zurückgenommen wurde, bleibt am Charakter notiert
            und wird beim erneuten Abschließen automatisch wieder angewandt,
            soweit Regeln und AP es dann noch zulassen.
          </p>

          <CreationResetTable rows={creationRows} />
        </div>
      </article>
    </>
  );
}

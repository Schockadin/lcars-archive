import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import CharacterAssignmentTable from "./CharacterAssignmentTable";
import CreationResetTable, {
  type CreationStateRow,
} from "./CreationResetTable";
import { parseCharacterStats } from "@/lib/characterStats";

export const metadata: Metadata = {
  title: "Charaktere",
  robots: { index: false, follow: false },
};

// Die Charakter-Verwaltung der Spielleitung (Menüpunkt „Charaktere"): wem eine
// Figur gehört und wo ihre Erschaffung steht. Die Zuordnung stand eine Weile
// zusätzlich auf der Kampagnen-Seite, weil es diesen Menüpunkt nicht gab —
// jetzt steht sie wieder hier, und zwar nur hier.
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
        <h1>Charaktere</h1>

        {/* Zwei Abschnitte wie auf der Kampagnen-Seite: erst wem die Figur
            gehört, dann wo ihre Erschaffung steht. */}
        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Zuordnung</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Wem gehört welche Figur? Gast-Accounts stehen nicht zur Auswahl —
              sie können keinen Charakter zugewiesen bekommen.
            </p>
            <CharacterAssignmentTable
              characters={characters}
              users={userOptions}
            />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Erschaffung</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Ein abgeschlossener Bogen lässt sich zurück in die Erschaffung
              schicken — etwa, wenn sich die Runde auf andere Startwerte
              einigt. Alle Steigerungen seit dem Abschluss werden dabei
              zurückgenommen: die Werte fallen auf den Stand der Erschaffung,
              die AP kommen aufs Konto zurück. Was zurückgenommen wurde, bleibt
              am Charakter notiert und wird beim erneuten Abschließen
              automatisch wieder angewandt, soweit Regeln und AP es dann noch
              zulassen.
            </p>
            <CreationResetTable rows={creationRows} />
          </section>
        </div>
      </article>
    </>
  );
}

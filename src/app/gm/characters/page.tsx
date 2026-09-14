import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import {
  getAllCharactersForAdmin,
  getCharacterCreationStates,
} from "@/lib/characters";
import CharacterAssignmentTable from "./CharacterAssignmentTable";
import CreationResetTable, {
  type CreationStateRow,
} from "./CreationResetTable";

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

  const [users, characters, creationStates] = await Promise.all([
    listAllUsers(),
    getAllCharactersForAdmin(),
    getCharacterCreationStates(),
  ]);
  // Gäste dürfen keinen Charakter zugewiesen bekommen (siehe
  // assignCharacterAction in ../actions.ts, das dieselbe Regel serverseitig
  // durchsetzt) — sie fehlen deshalb schon hier in der Auswahl.
  const roleMap = await getRoleMap();
  const userOptions = users
    .filter((u) => userCan(u, "characters.assignable", roleMap))
    .map((u) => ({ id: u.id, name: u.name }));

  // Erschaffungs-Status je Charakter. Er kommt aus getCharacterCreationStates
  // und NICHT aus den Charakterzeilen oben: die haben metadata.stats bereits
  // abgestreift (siehe parseCharacter), womit hier für jeden Bogen der
  // Vorgabewert stand und die Tabelle auch fertige Charaktere als „in
  // Erschaffung" zeigte. An die Client-Komponente gehen nur die Angaben, die
  // die Tabelle zeigt — der ganze Wertesatz wäre unnötiger Ballast im Bundle.
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const creationRows: CreationStateRow[] = creationStates.map((state) => ({
    id: state.id,
    name: state.name,
    playerName: state.playerId ? (nameById.get(state.playerId) ?? null) : null,
    creationLocked: state.creationLocked,
    pending: state.pending,
  }));

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

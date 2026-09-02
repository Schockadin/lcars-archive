import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../../dal";
import { canPlayNpcs, resolveViewer } from "@/lib/visibility";
import NewCharacterForm from "./NewCharacterForm";

export const metadata: Metadata = {
  title: "Neuer Charakter",
  robots: { index: false, follow: false },
};

interface Props {
  // ?npc=1 legt statt eines eigenen Charakters einen NPC an — denselben
  // Datensatz, nur ohne Spieler (siehe createCharacter). Einstieg dorthin ist
  // der Knopf „Neuer NPC" unter /user/content.
  searchParams: Promise<{ npc?: string }>;
}

// Anders als Missionen (nur gm/admin) darf jeder eingeloggte User außer
// Gast-Accounts eigene Charaktere anlegen (Gäste dürfen laut
// Produktentscheidung keinen Charakter zugewiesen haben, siehe
// assignCharacterAction in src/app/admin/actions.ts) — requireOwnUser prüft
// nur die Identität, die Rollen-Sperre kommt hier zusätzlich (Verteidigung
// in der Tiefe zusammen mit dem erneuten Check in actions.ts). NPCs darf
// zusätzlich nur anlegen, wer sie auch spielt (canPlayNpcs).
export default async function NewCharacterPage({ searchParams }: Props) {
  const user = await requireOwnUser();
  const roleMap = await getRoleMap();
  const wantsNpc = (await searchParams).npc === "1";
  const asNpc = wantsNpc && canPlayNpcs(resolveViewer(user, roleMap));
  const heading = asNpc ? "Neuen NPC anlegen" : "Neuen Charakter anlegen";

  // Der content.create-Check gilt für EIGENE Charaktere; für NPCs entscheidet
  // canPlayNpcs (siehe unten) — ein reines Admin-Konto ohne content.create
  // soll NPCs trotzdem anlegen können.
  if (!asNpc && !userCan(user, "content.create", roleMap)) {
    return (
      <>
        <PageMeta title="Neuer Charakter" section="users" />
        <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
          <h1>Neuen Charakter anlegen</h1>
          <p className="lcars-empty-state">
            Gast-Accounts können keine Charaktere anlegen.
          </p>
        </article>
      </>
    );
  }

  if (wantsNpc && !asNpc) {
    return (
      <>
        <PageMeta title="Neuer NPC" section="users" />
        <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
          <h1>Neuen NPC anlegen</h1>
          <p className="lcars-empty-state">
            NPCs kann nur die Spielleitung anlegen.
          </p>
        </article>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={asNpc ? "Neuer NPC" : "Neuer Charakter"}
        section="users"
      />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>{heading}</h1>
        {asNpc && (
          <p className="lcars-text">
            Ein NPC gehört niemandem: Er bekommt keinen Spieler und steht danach
            in Gesprächen als Gegenüber zur Auswahl — geschrieben wird er von
            der Spielleitung. Zuordnen lässt er sich später jederzeit unter
            „Leitung &rarr; Charaktere“.
          </p>
        )}
        <NewCharacterForm
          userId={user.id}
          asNpc={asNpc}
          isAdminOrGM={userCan(user, "content.autolink_tools", roleMap)}
        />
      </article>
    </>
  );
}

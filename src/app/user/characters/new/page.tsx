import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../../dal";
import NewCharacterForm from "./NewCharacterForm";

export const metadata: Metadata = {
  title: "Neuer Charakter",
  robots: { index: false, follow: false },
};

// Anders als Missionen (nur gm/admin) darf jeder eingeloggte User außer
// Gast-Accounts eigene Charaktere anlegen (Gäste dürfen laut
// Produktentscheidung keinen Charakter zugewiesen haben, siehe
// assignCharacterAction in src/app/admin/actions.ts) — requireOwnUser prüft
// nur die Identität, die Rollen-Sperre kommt hier zusätzlich (Verteidigung
// in der Tiefe zusammen mit dem erneuten Check in actions.ts).
export default async function NewCharacterPage() {
  const user = await requireOwnUser();

  if (user.role === "guest") {
    return (
      <>
        <PageMeta title="Neuer Charakter" section="users" />
        <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
          <h1>Neuen Charakter anlegen</h1>
          <p className="lcars-empty-state">
            Gast-Accounts können keine Charaktere anlegen.
          </p>
        </article>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Neuer Charakter" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Neuen Charakter anlegen</h1>
        <NewCharacterForm
          userId={user.id}
          isAdminOrGM={user.role === "gm" || user.role === "admin"}
        />
      </article>
    </>
  );
}

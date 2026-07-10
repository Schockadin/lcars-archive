import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import { LcarsDataRow } from "@/components/lcars";
import CreateUserForm from "./CreateUserForm";
import UserManagementTable from "./UserManagementTable";
import CharacterAssignmentTable from "./CharacterAssignmentTable";
import RevalidateCachePanel from "./RevalidateCachePanel";
import UserBackupPanel from "./UserBackupPanel";
import DbBackupPanel from "./DbBackupPanel";
import TimelineRegeneratePanel from "./TimelineRegeneratePanel";
import AssignOwnerlessMissionsPanel from "./AssignOwnerlessMissionsPanel";

export const metadata: Metadata = {
  title: "Nutzerverwaltung",
  robots: { index: false, follow: false },
};

// Erhöht das Timeout-Limit aller Server Actions auf dieser Seite (siehe
// Next.js-Doku zu maxDuration — bei Server Actions gilt der Wert nur auf
// Seitenebene, nicht pro Action-Datei) — u.a. für den DB-Backup-Export/
// -Import, der bei größeren Datenständen länger als das Default-Timeout
// laufen kann. Die tatsächliche Obergrenze setzt am Ende trotzdem die
// Deployment-Plattform (Netlify).
export const maxDuration = 60;

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
  // Gäste dürfen keinen Charakter zugewiesen bekommen (siehe
  // assignCharacterAction in ./actions.ts, das dieselbe Regel serverseitig
  // durchsetzt) — sie fehlen deshalb schon hier in der Auswahl.
  const userOptions = users
    .filter((u) => u.role !== "guest")
    .map((u) => ({ id: u.id, name: u.name }));
  const gmOptions = users
    .filter((u) => u.role === "gm" || u.role === "admin")
    .map((u) => ({ id: u.id, name: u.name }));

  // Feste Anzahl an Werkzeug-Panels im "Admin Actions"-Akkordeon — kein
  // DB-Wert, nur der Vollständigkeit halber im Kopf gezeigt (gleiche Optik
  // wie die anderen DataRow-Akkordeons hier, die einen Datensatz-Zähler
  // zeigen).
  const adminActionCount = 5;

  return (
    <>
      <PageMeta title="Nutzerverwaltung" section="users" />
      <article className="mb-[10px] max-w-[800px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>{isAdmin ? "Nutzerverwaltung" : "Charaktere zuordnen"}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          {isAdmin && (
            <LcarsDataRow
              value={users.length}
              label="User"
              color="var(--lcars-amber)"
              defaultOpen
            >
              <div className="flex flex-col gap-[32px] pt-[8px]">
                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">Neuen User anlegen</h2>
                  <CreateUserForm />
                </section>

                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">
                    {users.length} registrierte User
                  </h2>
                  <UserManagementTable users={users} isAdmin={isAdmin} />
                </section>
              </div>
            </LcarsDataRow>
          )}

          <LcarsDataRow
            value={characters.length}
            label="Charaktere"
            color="var(--lcars-blue)"
            defaultOpen
          >
            <div className="pt-[8px]">
              <CharacterAssignmentTable
                characters={characters}
                users={userOptions}
              />
            </div>
          </LcarsDataRow>

          {isAdmin && (
            <LcarsDataRow
              value={adminActionCount}
              label="Admin Actions"
              color="var(--lcars-purple)"
              defaultOpen
            >
              <div className="flex flex-col gap-[32px] pt-[8px]">
                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">User-Backup</h2>
                  <UserBackupPanel />
                </section>

                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">DB-Backup</h2>
                  <DbBackupPanel />
                </section>

                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">Cache</h2>
                  <RevalidateCachePanel />
                </section>

                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">Timeline</h2>
                  <TimelineRegeneratePanel />
                </section>

                <section className="flex flex-col gap-[12px]">
                  <h2 className="text-lcars-amber">Missionen ohne Owner</h2>
                  <AssignOwnerlessMissionsPanel gms={gmOptions} />
                </section>
              </div>
            </LcarsDataRow>
          )}
        </div>
      </article>
    </>
  );
}

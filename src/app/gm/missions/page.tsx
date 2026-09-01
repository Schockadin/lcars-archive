import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllMissionsForGmOverview } from "@/lib/missions";
import AdminMissionsBrowser from "./AdminMissionsBrowser";

export const metadata: Metadata = {
  title: "Missionen",
  robots: { index: false, follow: false },
};

// GM-oder-admin (wie /gm/characters) — Übersicht ALLER Missionen (inkl.
// Entwürfe) mit Bearbeiten/Löschen/Owner-Zuweisung pro Zeile, neuer
// GM-Menüpunkt "Missionen" (siehe HeaderUserNav.tsx). Kein
// Sichtbarkeits-Feld: Missionen haben (anders als Charaktere/Mission-Logs/
// Archiv-Einträge) keine visibility-Spalte, siehe ActionsMenu.tsx.
export default async function AdminMissionsPage() {
  await requireGM();

  const [missions, users] = await Promise.all([
    getAllMissionsForGmOverview(),
    listAllUsers(),
  ]);
  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Missionen" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Missionen</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <AdminMissionsBrowser missions={missions} users={userOptions} />
        </div>
      </article>
    </>
  );
}

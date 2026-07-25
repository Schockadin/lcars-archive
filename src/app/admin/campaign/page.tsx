import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import { getAllMissionsForGmOverview } from "@/lib/missions";
import { getIngameYear } from "@/lib/campaign";
import CharacterAssignmentTable from "../CharacterAssignmentTable";
import AdminMissionsBrowser from "../missions/AdminMissionsBrowser";
import IngameYearForm from "./IngameYearForm";

export const metadata: Metadata = {
  title: "Kampagne",
  robots: { index: false, follow: false },
};

// GM-oder-admin — konsolidierte Kampagnen-Seite (früher getrennte Menüpunkte
// "Missionen" + "Charaktere"): Ingame-Jahr einstellen, Charaktere zuordnen
// und alle Missionen verwalten an einem Ort. Neuer GM-Menüpunkt "Kampagne"
// (siehe HeaderUserNav.tsx), der den bisherigen "Missionen"-Punkt ablöst; die
// alten Routen /admin/missions und /admin/characters bleiben per Direktlink
// weiter erreichbar.
export default async function AdminCampaignPage() {
  await requireGM();

  const [users, characters, missions, ingameYear] = await Promise.all([
    listAllUsers(),
    getAllCharactersForAdmin(),
    getAllMissionsForGmOverview(),
    getIngameYear(),
  ]);

  // Gäste dürfen keinen Charakter zugewiesen bekommen (siehe
  // assignCharacterAction) — sie fehlen deshalb schon hier in der Auswahl.
  const characterUserOptions = users
    .filter((u) => u.role !== "guest")
    .map((u) => ({ id: u.id, name: u.name }));
  const missionUserOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Kampagne" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Kampagne</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Ingame-Jahr</h2>
            <IngameYearForm currentYear={ingameYear} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Charaktere</h2>
            <CharacterAssignmentTable
              characters={characters}
              users={characterUserOptions}
            />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Missionen</h2>
            <AdminMissionsBrowser
              missions={missions}
              users={missionUserOptions}
            />
          </section>
        </div>
      </article>
    </>
  );
}

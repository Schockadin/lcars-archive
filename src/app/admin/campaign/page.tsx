import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getAllCharactersForAdmin } from "@/lib/characters";
import { getAllMissionsForGmOverview } from "@/lib/missions";
import { getIngameYearInfo } from "@/lib/campaign";
import { listApBalances } from "@/lib/characterAp";
import CharacterAssignmentTable from "../CharacterAssignmentTable";
import AdminMissionsBrowser from "../missions/AdminMissionsBrowser";
import IngameYearForm from "./IngameYearForm";
import ApAwardPanel from "./ApAwardPanel";

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

  const [users, characters, missions, ingameYearInfo, apBalances] =
    await Promise.all([
      listAllUsers(),
      getAllCharactersForAdmin(),
      getAllMissionsForGmOverview(),
      getIngameYearInfo(),
      listApBalances(),
    ]);

  // Kontostände in EINER Abfrage geholt und hier zugeordnet — sonst wäre es
  // eine Abfrage je Charakter.
  const balanceByCharacter = new Map(
    apBalances.map((row) => [row.characterId, row.available]),
  );
  const apCharacters = characters.map((c) => ({
    id: c.id,
    name: c.name,
    available: balanceByCharacter.get(c.id) ?? 0,
  }));

  // Gäste dürfen keinen Charakter zugewiesen bekommen (siehe
  // assignCharacterAction) — sie fehlen deshalb schon hier in der Auswahl.
  const roleMap = await getRoleMap();
  const characterUserOptions = users
    .filter((u) => userCan(u, "characters.assignable", roleMap))
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
            <h2 className="text-lcars-primary">Ingame-Jahr</h2>
            <IngameYearForm info={ingameYearInfo} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Erfahrungspunkte (AP)</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Je 1 AP für eine gespielte Session und ein geschriebenes Logbuch,
              für einen Missions- oder Story-Abschluss ein frei gewählter
              Betrag. Steigerungen buchen die Spieler:innen selbst auf ihrem
              Charakterbogen ab.
            </p>
            <ApAwardPanel characters={apCharacters} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Charaktere</h2>
            <CharacterAssignmentTable
              characters={characters}
              users={characterUserOptions}
            />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Missionen</h2>
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

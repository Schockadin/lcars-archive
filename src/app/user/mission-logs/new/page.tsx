import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../../dal";
import {
  getAllMissions,
  getNextSessionNr,
  getMostRecentLogDate,
} from "@/lib/missions";
import NewMissionLogForm from "./NewMissionLogForm";

export const metadata: Metadata = {
  title: "Neuer Missionslog",
  robots: { index: false, follow: false },
};

export default async function NewMissionLogPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string }>;
}) {
  const { user, characters } = await requireOwnCharacters();
  const roleMap = await getRoleMap();

  // Nur eigene bereits veröffentlichte Charaktere kommen als Autor für einen
  // neuen Log infrage — ein noch als Entwurf gespeicherter Charakter ist für
  // niemand außer dem Owner sichtbar (siehe canViewDraft in visibility.ts),
  // der Autor-Link im Log würde also für alle anderen ins Leere laufen.
  const publishedCharacters = characters.filter((c) => !c.is_draft);

  // Nur laden, wenn überhaupt ein Formular gerendert wird — analog zu
  // dialogues/new/page.tsx.
  const missions = publishedCharacters.length > 0 ? await getAllMissions() : [];

  // Vorbelegung der Mission über ?mission=<slug> — verlinkt vom "Neues
  // Log"-Button auf der Mission-Detailseite (MissionLogList.tsx). Nur
  // übernehmen, wenn der Slug tatsächlich zu einer bestehenden Mission
  // gehört, sonst bleibt es beim ersten Eintrag der Liste (Default des
  // <select> ohne explizite defaultValue).
  const { mission: missionSlugParam } = await searchParams;
  const preselectedMission = missionSlugParam
    ? missions.find((m) => m.slug === missionSlugParam)
    : undefined;

  // Grober Vorschlagswert für Session-Nr (erster eigener Charakter +
  // vorbelegte bzw. erste Mission) — das Formular selbst kann ihn
  // client-seitig ohne weiteren Server-Roundtrip nicht neu berechnen, wenn
  // die Auswahl wechselt. Das Feld bleibt editierbar, der User kann die Zahl
  // bei Bedarf anpassen.
  const sessionNrMission = preselectedMission ?? missions[0];
  const nextSessionNr =
    publishedCharacters.length > 0 && sessionNrMission
      ? await getNextSessionNr(sessionNrMission.id, publishedCharacters[0].id)
      : 1;
  const defaultLogDate = await getMostRecentLogDate();

  return (
    <>
      <PageMeta title="Neuer Missionslog" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <h1>Neuen Missionslog anlegen</h1>

        {publishedCharacters.length === 0 ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Du brauchst zuerst einen eigenen Charakter, um einen Missionslog
              zu schreiben. Wende dich dafür an die Spielleitung.
            </p>
            <p>
              <Link href="/user" className="text-lcars-primary-ink underline">
                ← Zurück zum Profil
              </Link>
            </p>
          </div>
        ) : missions.length === 0 ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Es gibt noch keine Missionen, denen ein Log zugeordnet werden
              könnte.
            </p>
            <p>
              <Link href="/user" className="text-lcars-primary-ink underline">
                ← Zurück zum Profil
              </Link>
            </p>
          </div>
        ) : (
          <NewMissionLogForm
            userId={user.id}
            ownCharacters={publishedCharacters.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
            }))}
            missions={missions.map((m) => ({ slug: m.slug, title: m.title }))}
            defaultSessionNr={nextSessionNr}
            defaultLogDate={defaultLogDate}
            defaultMissionSlug={preselectedMission?.slug}
            isAdminOrGM={userCan(user, "content.autolink_tools", roleMap)}
          />
        )}
      </article>
    </>
  );
}

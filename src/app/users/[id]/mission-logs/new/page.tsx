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
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, characters } = await requireOwnCharacters(id);

  // Nur laden, wenn überhaupt ein Formular gerendert wird — analog zu
  // dialogues/new/page.tsx.
  const missions = characters.length > 0 ? await getAllMissions() : [];

  // Grober Vorschlagswert für Session-Nr (erster eigener Charakter + erste
  // Mission) — das Formular selbst kann ihn client-seitig ohne weiteren
  // Server-Roundtrip nicht neu berechnen, wenn die Auswahl wechselt. Das
  // Feld bleibt editierbar, der User kann die Zahl bei Bedarf anpassen.
  const nextSessionNr =
    characters.length > 0 && missions.length > 0
      ? await getNextSessionNr(missions[0].id, characters[0].id)
      : 1;
  const defaultLogDate = await getMostRecentLogDate();

  return (
    <>
      <PageMeta title="Neuer Missionslog" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Neuen Missionslog anlegen</h1>

        {characters.length === 0 ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Du brauchst zuerst einen eigenen Charakter, um einen Missionslog
              zu schreiben. Wende dich dafür an die Spielleitung.
            </p>
            <p>
              <Link
                href={`/users/${user.id}`}
                className="text-lcars-amber underline"
              >
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
              <Link
                href={`/users/${user.id}`}
                className="text-lcars-amber underline"
              >
                ← Zurück zum Profil
              </Link>
            </p>
          </div>
        ) : (
          <NewMissionLogForm
            userId={user.id}
            ownCharacters={characters.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
            }))}
            missions={missions.map((m) => ({ slug: m.slug, title: m.title }))}
            defaultSessionNr={nextSessionNr}
            defaultLogDate={defaultLogDate}
            isAdminOrGM={user.role === "gm" || user.role === "admin"}
          />
        )}
      </article>
    </>
  );
}

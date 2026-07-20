import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../../dal";
import { getCharactersWithPlayers } from "@/lib/characters";
import { getAllArchiveEntries } from "@/lib/archive";
import { getMostRecentLogDate } from "@/lib/missions";
import CreateDialogueForm from "./CreateDialogueForm";

export const metadata: Metadata = {
  title: "Neues Gespräch",
  robots: { index: false, follow: false },
};

export default async function NewDialoguePage() {
  const { user, characters } = await requireOwnCharacters();

  // Nur eigene bereits veröffentlichte Charaktere kommen als Gesprächsstarter
  // infrage — analog zu mission-logs/new/page.tsx: ein Entwurf ist für
  // niemand außer dem Owner sichtbar (siehe canViewDraft in visibility.ts).
  const publishedCharacters = characters.filter((c) => !c.is_draft);

  // Nur laden, wenn überhaupt ein Formular gerendert wird — kein
  // Charakter, keine Partner-/Ort-Liste nötig.
  const [partnerCharacters, archiveEntries, defaultLogDate] =
    publishedCharacters.length > 0
      ? await Promise.all([
          getCharactersWithPlayers(user.id),
          getAllArchiveEntries(),
          getMostRecentLogDate(),
        ])
      : [[], [], null];
  const locations = archiveEntries
    .filter((e) => e.category === "location")
    .map((l) => ({ slug: l.slug, title: l.title }));

  return (
    <>
      <PageMeta title="Neues Gespräch" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Neues Gespräch beginnen</h1>

        {publishedCharacters.length === 0 ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Du brauchst zuerst einen eigenen Charakter, um ein Gespräch zu
              beginnen. Wende dich dafür an die Spielleitung.
            </p>
            <p>
              <Link
                href="/user"
                className="text-lcars-amber underline"
              >
                ← Zurück zum Profil
              </Link>
            </p>
          </div>
        ) : (
          <CreateDialogueForm
            userId={user.id}
            ownCharacters={publishedCharacters}
            partnerCharacters={partnerCharacters}
            locations={locations}
            defaultLogDate={defaultLogDate}
          />
        )}
      </article>
    </>
  );
}

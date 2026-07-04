import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../../dal";
import { getCharactersWithPlayers } from "@/lib/characters";
import { getAllArchiveEntries } from "@/lib/archive";
import CreateDialogueForm from "./CreateDialogueForm";

export const metadata: Metadata = {
  title: "Neues Gespräch",
  robots: { index: false, follow: false },
};

export default async function NewDialoguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, characters } = await requireOwnCharacters(id);

  // Nur laden, wenn überhaupt ein Formular gerendert wird — kein
  // Charakter, keine Partner-/Ort-Liste nötig.
  const [partnerCharacters, archiveEntries] =
    characters.length > 0
      ? await Promise.all([
          getCharactersWithPlayers(user.id),
          getAllArchiveEntries(),
        ])
      : [[], []];
  const locations = archiveEntries
    .filter((e) => e.category === "location")
    .map((l) => ({ slug: l.slug, title: l.title }));

  return (
    <>
      <PageMeta title="Neues Gespräch" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Neues Gespräch beginnen</h1>

        {characters.length === 0 ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Du brauchst zuerst einen eigenen Charakter, um ein Gespräch zu
              beginnen. Wende dich dafür an die Spielleitung.
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
          <CreateDialogueForm
            userId={user.id}
            ownCharacters={characters}
            partnerCharacters={partnerCharacters}
            locations={locations}
          />
        )}
      </article>
    </>
  );
}

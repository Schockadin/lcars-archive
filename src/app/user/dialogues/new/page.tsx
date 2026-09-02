import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../../dal";
import {
  getCharactersWithPlayers,
  getNpcCharacterOptions,
} from "@/lib/characters";
import { getCurrentUserPermissions } from "@/lib/dal";
import { listGmUsers } from "@/lib/users";
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

  // Die Spielleitung darf ein Gespräch AUS SICHT eines NPC beginnen (sie
  // spielt ihn) — für sie ist die Seite deshalb auch ohne eigenen Charakter
  // sinnvoll.
  const isGm = (await getCurrentUserPermissions()).has("gm.access");
  const npcCharacters = await getNpcCharacterOptions(isGm);
  const canStart = publishedCharacters.length > 0 || (isGm && npcCharacters.length > 0);

  // Nur laden, wenn überhaupt ein Formular gerendert wird — kein
  // Charakter, keine Partner-/Ort-/Spielleitungs-Liste nötig.
  const [partnerCharacters, archiveEntries, defaultLogDate, gms] = canStart
    ? await Promise.all([
        getCharactersWithPlayers(user.id),
        getAllArchiveEntries(),
        getMostRecentLogDate(),
        // Wer kann für die NPCs schreiben? Nur nötig, wenn es überhaupt NPCs
        // zur Auswahl gibt und die anfragende Person sie nicht selbst spielt.
        npcCharacters.length > 0 && !isGm ? listGmUsers() : Promise.resolve([]),
      ])
    : [[], [], null, []];
  const locations = archiveEntries
    .filter((e) => e.category === "location")
    .map((l) => ({ slug: l.slug, title: l.title }));

  return (
    <>
      <PageMeta title="Neues Gespräch" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Neues Gespräch beginnen</h1>

        {!canStart ? (
          <div className="lcars-text flex flex-col gap-[16px]">
            <p>
              Du brauchst zuerst einen eigenen Charakter, um ein Gespräch zu
              beginnen. Wende dich dafür an die Spielleitung.
            </p>
            <p>
              <Link href="/user" className="text-lcars-primary underline">
                ← Zurück zum Profil
              </Link>
            </p>
          </div>
        ) : (
          <CreateDialogueForm
            userId={user.id}
            ownCharacters={publishedCharacters}
            partnerCharacters={partnerCharacters}
            npcCharacters={npcCharacters}
            canPlayNpcs={isGm}
            gms={gms}
            locations={locations}
            defaultLogDate={defaultLogDate}
          />
        )}
      </article>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnCharacters } from "../../dal";
import { getCharactersWithPlayers } from "@/lib/characters";
import { listGmUsers } from "@/lib/users";
import { canPlayNpcs, canView, getViewer } from "@/lib/visibility";
import { getAllArchiveEntries, getNpcOptions } from "@/lib/archive";
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

  // NPCs als Gegenüber: angeboten wird, was diese Person sehen darf —
  // öffentliche NPCs allen, intern gehaltene nur mit den entsprechenden
  // Rechten (canView, wie überall sonst).
  const viewer = await getViewer();
  const npcs = (await getNpcOptions()).filter((npc) =>
    canView(npc.visibility, null, viewer),
  );
  // Wer NPCs spielt, darf ein Gespräch auch AUS SICHT eines NPC beginnen —
  // für diese Person ist die Seite deshalb auch ohne eigenen Charakter
  // sinnvoll.
  const playsNpcs = canPlayNpcs(viewer);
  const canStart =
    publishedCharacters.length > 0 || (playsNpcs && npcs.length > 0);

  // Nur laden, wenn überhaupt ein Formular gerendert wird — kein
  // Charakter, keine Partner-/Ort-/Spielleitungs-Liste nötig.
  const [partnerCharacters, archiveEntries, defaultLogDate, gms] = canStart
    ? await Promise.all([
        getCharactersWithPlayers(user.id),
        getAllArchiveEntries(),
        getMostRecentLogDate(),
        // Wer kann für die NPCs schreiben? Nur nötig, wenn es überhaupt NPCs
        // zur Auswahl gibt und die anfragende Person sie nicht selbst spielt.
        npcs.length > 0 && !playsNpcs ? listGmUsers() : Promise.resolve([]),
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
            npcs={npcs}
            canPlayNpcs={playsNpcs}
            gms={gms}
            locations={locations}
            defaultLogDate={defaultLogDate}
          />
        )}
      </article>
    </>
  );
}

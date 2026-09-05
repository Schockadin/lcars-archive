import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { userCan } from "@/lib/permissions";
import { verifySession, getRoleMap } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { getOwnCharacterForEdit, getOwnCharacterStats } from "@/lib/characters";
import { getApAccount } from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import CharacterHeadPanel from "./CharacterHeadPanel";
import CharacterValuesPanel from "./CharacterValuesPanel";
import CharacterBioPanel from "./CharacterBioPanel";
import RevisionsPanel from "@/app/_shared/RevisionsPanel";
import { listRevisions } from "@/lib/contentRevisions";
import { getViewer } from "@/lib/visibility";
import CharacterSheetButton from "./CharacterSheetButton";

export const metadata: Metadata = {
  title: "Charakter",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ characterId: string }>;
}

// Die eigene Charakterseite: Stammdaten, Werte und Biografie als drei Panels
// untereinander, darüber der Knopf für die Bogen-Vorschau. Kein Assistent —
// der ist nur fürs Anlegen da (siehe /user/characters/new).
//
// Die Berechtigung steckt wie überall in den Abfragen selbst (alle drei sind
// owner-gescoped): ein fremder oder unbekannter Charakter führt zurück auf
// die Übersicht, statt einen Fehler zu zeigen — das verrät auch nicht, ob es
// die id überhaupt gibt.
export default async function OwnCharacterPage({ params }: Props) {
  const { characterId } = await params;
  const session = await verifySession();

  const id = Number(characterId);
  if (!Number.isInteger(id)) redirect("/user/characters");

  const [character, sheet] = await Promise.all([
    getOwnCharacterForEdit(session.userId, id),
    getOwnCharacterStats(session.userId, id),
  ]);
  if (!character || !sheet) redirect("/user/characters");

  // Erst NACH dem Owner-Check: vorher ist nicht klar, ob der Charakter
  // überhaupt zu diesem Konto gehört.
  const [account, rules, talents, viewer, roleMap, revisions] = await Promise.all([
    getApAccount(sheet.id),
    getAdvancementRules(),
    listTalents(),
    getUserById(session.userId),
    getRoleMap(),
    // Versionshistorie der Biografie — der Owner-Check oben ist bereits
    // gelaufen, listRevisions prüft ihn über den Viewer noch einmal selbst.
    getViewer().then((v) => listRevisions("character", character.id, v)),
  ]);
  const isAdminOrGM =
    !!viewer && userCan(viewer, "content.autolink_tools", roleMap);

  return (
    <>
      <PageMeta title={character.name} section="users" />
      <article className="mb-[10px] flex flex-col gap-[16px]">
        <h1>{character.name}</h1>

        <CharacterSheetButton
          characterId={sheet.id}
          input={{
            characterName: sheet.name,
            rank: sheet.rank,
            species: sheet.species,
            portrait: sheet.portrait,
            stats: sheet.stats,
            bioHtml: character.bioHtml,
            talents,
          }}
        />

        <CharacterHeadPanel userId={session.userId} character={character} />

        {/* Das Werte-Panel bringt seine eigenen Abschnitte mit (AP-Konto,
            Kopfdaten, Attribute, Disziplinen, Listen) — eine zusätzliche Hülle
            darum wären nur zwei Titelleisten übereinander. */}
        <CharacterValuesPanel
          userId={session.userId}
          characterId={sheet.id}
          species={sheet.species}
          savedStats={sheet.stats}
          account={account}
          rules={rules}
          talents={talents}
        />

        <CharacterBioPanel
          userId={session.userId}
          characterId={character.id}
          isAdminOrGM={isAdminOrGM}
          bioHtml={character.bioHtml}
          sourceMarkdown={character.sourceMarkdown}
        />

        <RevisionsPanel
          contentType="character"
          contentId={character.id}
          path={`/user/characters/${character.id}`}
          revisions={revisions}
        />
      </article>
    </>
  );
}

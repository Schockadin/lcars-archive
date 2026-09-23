import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnCharacterForEdit, getOwnCharacterStats } from "@/lib/characters";
import { getApAccount } from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import { listFocuses } from "@/lib/focuses";
import { listCampaignRules } from "@/lib/campaignRules";
import CharacterHeadPanel from "./CharacterHeadPanel";
import CharacterPortraitPanel from "./CharacterPortraitPanel";
import CharacterValuesPanel from "./CharacterValuesPanel";
import CharacterBioPanel from "./CharacterBioPanel";
import RevisionsPanel from "@/app/_shared/RevisionsPanel";
import { listRevisions } from "@/lib/contentRevisions";
import { getViewer } from "@/lib/visibility";
import CharacterSheetButton from "./CharacterSheetButton";
import { characterEditHref } from "@/lib/contentRoutes";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import CharacterCreationGuide from "@/components/character/CharacterCreationGuide";

export const metadata: Metadata = {
  title: "Charakter",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ characterId: string }>;
}

// Die eigene Charakterseite: Profilbild, Personalakte, Werte, Biografie und
// Versionen als standardmäßig offene Klapp-Panels untereinander, darüber der
// Knopf für die Bogen-Vorschau. Kein Assistent — der ist nur fürs Anlegen da.
//
// Die Berechtigung steckt wie überall in den Abfragen selbst (beide sind
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
  const [account, rules, talents, focuses, campaignRules, revisions] =
    await Promise.all([
      getApAccount(sheet.id),
      getAdvancementRules(),
      listTalents(),
      listFocuses(),
      listCampaignRules(),
      // Versionshistorie der Biografie — der Owner-Check oben ist bereits
      // gelaufen, listRevisions prüft ihn über den Viewer noch einmal selbst.
      getViewer().then((v) => listRevisions("character", character.id, v)),
    ]);

  return (
    <>
      <PageMeta title={character.name} section="users" />
      <article className="mb-[10px] flex flex-col gap-[16px]">
        {/* Auch hier, nicht nur im Assistenten: Gesteigert und nachgetragen
            wird lange nach dem Anlegen — die Regeln zu AP, Talenten und
            Schwerpunkten schlägt man genau dann nach. */}
        <HelpTitleRow
          help={
            <HelpButton
              title="Charaktererschaffung"
              tutorial="charaktererschaffung"
            >
              <CharacterCreationGuide />
            </HelpButton>
          }
        >
          <h1>{character.name}</h1>
        </HelpTitleRow>

        <CharacterSheetButton
          characterId={sheet.id}
          input={{
            characterName: sheet.name,
            rank: sheet.rank,
            species: sheet.species,
            portrait: sheet.portrait,
            portraitCrop: sheet.portraitCrop,
            stats: sheet.stats,
            bioHtml: character.bioHtml,
            talents,
            campaignRules,
          }}
        />

        <CharacterPortraitPanel userId={session.userId} character={character} />

        <CharacterHeadPanel
          userId={session.userId}
          character={character}
          stats={sheet.stats}
        />

        {/* Das Werte-Panel bündelt seine fachlichen Unterabschnitte in einer
            gemeinsamen, aufklappbaren Hülle. */}
        <CharacterValuesPanel
          userId={session.userId}
          characterId={sheet.id}
          species={sheet.species}
          savedStats={sheet.stats}
          account={account}
          rules={rules}
          talents={talents}
          focuses={focuses}
        />

        <CharacterBioPanel
          userId={session.userId}
          characterId={character.id}
          bioHtml={character.bioHtml}
          sourceMarkdown={character.sourceMarkdown}
        />

        <RevisionsPanel
          contentType="character"
          contentId={character.id}
          path={characterEditHref(character.id)}
          revisions={revisions}
          defaultOpen
        />
      </article>
    </>
  );
}

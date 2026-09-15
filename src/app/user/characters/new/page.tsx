import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "../../dal";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import { listFocuses } from "@/lib/focuses";
import { listCampaignRules } from "@/lib/campaignRules";
import CharacterWizard from "./CharacterWizard";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import CharacterCreationGuide from "@/components/character/CharacterCreationGuide";

export const metadata: Metadata = {
  title: "Neuer Charakter",
  robots: { index: false, follow: false },
};

// Anders als Missionen (nur gm/admin) darf jeder eingeloggte User außer
// Gast-Accounts eigene Charaktere anlegen (Gäste dürfen laut
// Produktentscheidung keinen Charakter zugewiesen haben, siehe
// assignCharacterAction in src/app/admin/actions.ts) — requireOwnUser prüft
// nur die Identität, die Rollen-Sperre kommt hier zusätzlich (Verteidigung
// in der Tiefe zusammen mit dem erneuten Check in wizardAction.ts).
export default async function NewCharacterPage() {
  const user = await requireOwnUser();
  const roleMap = await getRoleMap();

  if (!userCan(user, "content.create", roleMap)) {
    return (
      <>
        <PageMeta title="Neuer Charakter" section="users" />
        <article className="mb-[10px]">
          {/* Auch hier, wo nichts anzulegen ist: Mitlesen dürfen
              Gast-Accounts, nur anlegen nicht — dieselbe Abwägung wie bei
              der Übersicht (/user/characters). */}
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
            <h1>Neuen Charakter anlegen</h1>
          </HelpTitleRow>
          <p className="lcars-empty-state">
            Gast-Accounts können keine Charaktere anlegen.
          </p>
        </article>
      </>
    );
  }

  // Regelwerk und Talent-Katalog braucht erst der zweite Schritt — sie hängen
  // aber an nichts, was der Assistent unterwegs ändert, und werden deshalb
  // gleich mitgeladen statt nachträglich nachgereicht.
  const [rules, talents, focuses, campaignRules] = await Promise.all([
    getAdvancementRules(),
    listTalents(),
    listFocuses(),
    listCampaignRules(),
  ]);

  return (
    <>
      <PageMeta title="Neuer Charakter" section="users" />
      <article className="mb-[10px]">
        {/* Die ausführliche Erklärung als Fenster, nicht als Link: Wer sie
            mitten im Assistenten aufschlägt, darf die halb ausgefüllten
            Felder nicht verlieren. Sie steht da, wo sie auf jeder anderen
            Seite steht — oben rechts neben der Überschrift. */}
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
          <h1>Neuen Charakter anlegen</h1>
        </HelpTitleRow>
        <p className="lcars-text">
          In vier Schritten: Stammdaten, Werte, Biografie und zum Schluss eine
          Vorschau des fertigen Charakterbogens. Zwischen den Schritten kannst
          du jederzeit hin und her wechseln — angelegt wird der Charakter erst
          mit „Fertig“.
        </p>

        <CharacterWizard
          userId={user.id}
          isAdminOrGM={userCan(user, "content.autolink_tools", roleMap)}
          rules={rules}
          talents={talents}
          focuses={focuses}
          campaignRules={campaignRules}
        />
      </article>
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { getAllCharactersForAdmin } from "@/lib/characters";
import { getIngameYearInfo } from "@/lib/campaign";
import { listApBalances } from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import {
  listCompletableMissions,
  listActiveCharactersForAp,
} from "@/lib/gameSessions";
import IngameYearForm from "./IngameYearForm";
import ApAwardPanel from "./ApAwardPanel";
import MissionApPanel from "./MissionApPanel";
import HelpHeading from "@/components/help/HelpHeading";
import { GmCampaignGuide } from "@/components/help/guides/GmGuides";

export const metadata: Metadata = {
  title: "Kampagne",
  robots: { index: false, follow: false },
};

// GM-oder-admin — die Kampagnen-Seite: Ingame-Jahr, AP-Vergabe und
// Missionsabschluss. Die Missionsübersicht und ihre Verwaltung liegen separat
// unter /gm/missions.
//
// Die Zuordnung der Charaktere zu Konten stand hier ebenfalls, seit es dafür
// keinen eigenen Menüpunkt mehr gab. Sie steht jetzt wieder unter
// "Charaktere" (/gm/characters) — zusammen mit dem Erschaffungs-Status, der
// ohnehin nur dort ist. Zweimal dieselbe Tabelle zu pflegen, half niemandem.
export default async function AdminCampaignPage() {
  await requireGM();

  const [
    characters,
    ingameYearInfo,
    apBalances,
    rules,
    completableMissions,
    apCharacterOptions,
  ] = await Promise.all([
    getAllCharactersForAdmin(),
    getIngameYearInfo(),
    listApBalances(),
    getAdvancementRules(),
    listCompletableMissions(),
    listActiveCharactersForAp(),
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

  return (
    <>
      <PageMeta title="Kampagne" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <HelpHeading
          eyebrow="Zugriff · Spielleitung"
          title="Kampagne"
          helpTitle="Leitung · Kampagne"
          tutorial="spielleitung-admins"
        >
          <GmCampaignGuide />
        </HelpHeading>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Ingame-Jahr</h2>
            <IngameYearForm info={ingameYearInfo} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Erfahrungspunkte (AP)</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Je {rules.apPerSession} AP für eine gespielte Session und{" "}
              {rules.apPerLogbook} AP für ein geschriebenes Logbuch; die Beträge
              stellt die Spielleitung unter „AP“ ein. Eine ganze Session
              schreibt man am besten unter „Sessions“ auf einmal gut — mit
              verknüpftem Logbuch kommt die Logbuch-AP dort automatisch dazu. AP
              für einen Missionsabschluss gibt es nur über „Mission abschließen“
              weiter unten; Steigerungen buchen die Spieler:innen selbst auf
              ihrem Charakterbogen ab. Hier bleibt die freie Buchung für alles
              andere und für Korrekturen.
            </p>
            <ApAwardPanel characters={apCharacters} rules={rules} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Mission abschließen</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              AP für einen Missionsabschluss gibt es nur hier: die Mission wird
              dabei ausgewählt und auf „abgeschlossen“ gesetzt. Vorbelegt sind{" "}
              {rules.apPerMission} AP je Charakter (Regel „AP pro beendeter
              Mission“ unter <Link href="/gm/ap">Erfahrungspunkte</Link>).
            </p>
            <MissionApPanel
              missions={completableMissions}
              characters={apCharacterOptions}
              defaultMissionAp={rules.apPerMission}
            />
          </section>

        </div>
      </article>
    </>
  );
}

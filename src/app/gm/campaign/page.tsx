import Link from "next/link";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { getIngameYearInfo } from "@/lib/campaign";
import { getAdvancementRules } from "@/lib/advancementSettings";
import IngameYearForm from "./IngameYearForm";
import AdvancementRulesForm from "../ap/AdvancementRulesForm";
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

  const [ingameYearInfo, rules] = await Promise.all([
    getIngameYearInfo(), getAdvancementRules(),
  ]);

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

          <div className="flex flex-wrap gap-[8px]">
            <Link className="lcars-pill-btn--outline" href="/gm/ap">AP-Vergabe und Konten</Link>
            <Link className="lcars-pill-btn--outline" href="/gm/campaign/rules">Weitere Regeln bearbeiten</Link>
          </div>
          <details className="lcars-details">
            <summary className="lcars-details-summary"><span className="lcars-data-row-chevron" aria-hidden="true" /><h2 className="inline text-lcars-primary-ink">Steigerungsregeln</h2></summary>
            <div className="mt-[12px] flex flex-col gap-[12px]">
              <p className="text-lcars-ink-dim text-[13px]">Kosten und Budgets für Charaktersteigerungen sowie AP-Vorgaben anpassen.</p>
              <AdvancementRulesForm rules={rules} />
            </div>
          </details>

        </div>
      </article>
    </>
  );
}

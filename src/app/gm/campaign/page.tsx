import Link from "next/link";
import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { getIngameYearInfo } from "@/lib/campaign";
import { getAdvancementRules } from "@/lib/advancementSettings";
import IngameYearForm from "./IngameYearForm";
import AdvancementRulesForm from "../ap/AdvancementRulesForm";
import { listCampaignRulesFresh } from "@/lib/campaignRules";
import RuleEditor from "../rules/RuleEditor";
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

  const [ingameYearInfo, rules, campaignRules] = await Promise.all([
    getIngameYearInfo(), getAdvancementRules(), listCampaignRulesFresh(),
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
          <details className="lcars-details">
            <summary className="lcars-details-summary"><span className="lcars-data-row-chevron" aria-hidden="true" /><span className="text-lcars-primary-ink">Ingame-Jahr</span><span className="ml-auto font-lcars-mono">{ingameYearInfo.effectiveYear ?? "Noch kein Jahr"}</span></summary>
            <div className="mt-[12px]"><IngameYearForm info={ingameYearInfo} /></div>
          </details>

          <div className="flex flex-wrap gap-[8px]">
            <Link className="lcars-pill-btn--outline" href="/gm/ap">AP-Vergabe und Konten</Link>
          </div>
          <details className="lcars-details">
            <summary className="lcars-details-summary"><span className="lcars-data-row-chevron" aria-hidden="true" /><h2 className="inline text-lcars-primary-ink">Weitere Regeln</h2></summary>
            <div className="mt-[12px]"><RuleEditor rules={campaignRules} /></div>
          </details>
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

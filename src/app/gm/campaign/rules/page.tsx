import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listCampaignRulesFresh } from "@/lib/campaignRules";
import RuleEditor from "../../rules/RuleEditor";
export const metadata: Metadata = { title: "Weitere Regeln", robots: { index: false, follow: false } };
export default async function CampaignRulesPage() {
  await requireGM(); const rules = await listCampaignRulesFresh();
  return <><PageMeta title="Weitere Regeln" section="users" /><article className="mb-[10px] lcars-wide-column"><p className="lcars-eyebrow">Zugriff · Spielleitung</p><h1>Weitere Regeln</h1><div className="lcars-text flex flex-col gap-[16px]"><p className="text-lcars-ink-dim text-[13px]">Hausregeln der Runde erscheinen im Regelbereich der Spielenden und auf den Charakterbögen.</p><RuleEditor rules={rules} /></div></article></>;
}

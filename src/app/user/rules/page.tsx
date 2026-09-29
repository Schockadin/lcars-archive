import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { listCampaignRules } from "@/lib/campaignRules";
export const metadata: Metadata = { title: "Regeln", robots: { index: false, follow: false } };
export default async function UserRulesPage() {
  await requireNonGuest(); const rules = await listCampaignRules();
  return <><PageMeta title="Regeln" section="users" /><article className="mb-[10px] lcars-wide-column"><p className="lcars-eyebrow">Zugriff · Spielende</p><h1>Regeln</h1><nav className="my-[16px] flex flex-wrap gap-[8px]"><Link className="lcars-pill-btn--outline" href="/user/rules/focuses">Schwerpunkte</Link><Link className="lcars-pill-btn--outline" href="/user/rules/talents">Talente</Link></nav><div className="lcars-text flex flex-col gap-[16px]">{rules.length === 0 ? <p className="lcars-empty-state">Es wurden noch keine weiteren Regeln ergänzt.</p> : rules.map((rule) => <section key={rule.id} className="rounded-lg border border-[var(--lcars-ink-dim)]/25 p-[12px]"><h2 className="font-semibold">{rule.name}</h2><div className="mission-body mt-[6px]" dangerouslySetInnerHTML={{ __html: rule.bodyHtml }} /></section>)}</div></article></>;
}

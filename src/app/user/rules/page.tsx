import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { ADVANCEMENT_RULE_FIELDS } from "@/lib/advancement";
export const metadata: Metadata = { title: "Regeln", robots: { index: false, follow: false } };
export default async function UserRulesPage() {
  await requireNonGuest();
  const rules = await getAdvancementRules();
  return (
    <>
      <PageMeta title="Regeln" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielende</p>
        <h1>Regeln</h1>
        <nav className="my-[16px] flex flex-wrap gap-[8px]">
          <Link className="lcars-pill-btn--outline" href="/user/rules/focuses">Schwerpunkte</Link>
          <Link className="lcars-pill-btn--outline" href="/user/rules/talents">Talente</Link>
        </nav>
        <section className="lcars-text flex flex-col gap-[16px]">
          <h2 className="text-lcars-primary-ink">Steigerungsregeln</h2>
          <p className="text-lcars-ink-dim text-[13px]">Die aktuell geltenden Kosten, Erschaffungsbudgets und AP-Vorgaben der Runde.</p>
          <dl className="flex flex-col gap-[12px]">
            {ADVANCEMENT_RULE_FIELDS.map((field) => (
              <div key={field.key} className="flex items-baseline gap-[16px] border-b border-[var(--lcars-ink-dim)]/25 pb-[10px]">
                <dt className="flex-1">
                  {field.label}
                  <span className="block text-lcars-ink-dim text-[12px]">{field.hint}</span>
                </dt>
                <dd className="font-mono text-lcars-primary-ink">{rules[field.key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </>
  );
}

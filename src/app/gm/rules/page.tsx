import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listCampaignRulesFresh } from "@/lib/campaignRules";
import RuleEditor from "./RuleEditor";

export const metadata: Metadata = {
  title: "Eigene Regeln",
  robots: { index: false, follow: false },
};

// Hausregeln der Runde verwalten. Bewusst listCampaignRulesFresh (ungecacht):
// eine gerade gespeicherte Änderung muss beim Zurückkehren sofort dastehen.
// Die gecachte Variante (listCampaignRules) nutzen die Charakterbögen.
export default async function GmRulesPage() {
  await requireGM();
  const rules = await listCampaignRulesFresh();

  return (
    <>
      <PageMeta title="Eigene Regeln" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Eigene Regeln</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-contrast text-[13px]">
            Hausregeln der Runde. Sie erscheinen auf dem Spickzettel jedes
            Charakterbogens (Blatt 2, auch im PDF) hinter Momentum, Bedrohung
            und Entschlossenheit — und stehen dort für alle gleich, egal
            welcher Charakter. Die Reihenfolge bestimmt die kleine Zahl; bei
            Gleichstand wird alphabetisch sortiert.
          </p>
          <RuleEditor rules={rules} />
        </div>
      </article>
    </>
  );
}

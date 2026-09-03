import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import {
  listApLedger,
  listApAccountSummaries,
  AP_LEDGER_LIMIT,
} from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import ApLedgerTable from "./ApLedgerTable";
import AdvancementRulesForm from "./AdvancementRulesForm";

export const metadata: Metadata = {
  title: "AP",
  robots: { index: false, follow: false },
};

// Gesamtübersicht über alle AP-Bewegungen plus der Regel-Editor. Vergeben
// wird weiterhin unter „Kampagne" (Einzelbuchungen) bzw. „Sessions"
// (Sammelgutschrift) — hier geht es ums Nachvollziehen und ums Regelwerk.
export default async function GmApPage() {
  await requireGM();

  const [accounts, ledger, rules] = await Promise.all([
    listApAccountSummaries(),
    listApLedger(),
    getAdvancementRules(),
  ]);

  return (
    <>
      <PageMeta title="AP" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Erfahrungspunkte</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Kontostände</h2>
            {accounts.length === 0 ? (
              <p className="lcars-empty-state">Noch keine AP vergeben.</p>
            ) : (
              <div className="flex flex-col gap-[4px]">
                {accounts.map((account) => (
                  <div
                    key={account.characterId}
                    className="flex flex-wrap items-baseline gap-[8px] border-b border-[var(--lcars-ink-dim)]/20 pb-[4px]"
                  >
                    <span className="min-w-[160px] flex-1">
                      {account.characterName}
                      {account.playerName && (
                        <span className="text-lcars-ink-dim text-[12px]">
                          {" "}
                          · {account.playerName}
                        </span>
                      )}
                    </span>
                    <span className="text-lcars-ink-dim text-[13px]">
                      {account.earned} erhalten · {account.spent} ausgegeben
                    </span>
                    <span className="stat-ap-amount w-[90px] text-right">
                      {account.available} AP
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-lcars-ink-dim text-[13px]">
              Vergeben wird unter <Link href="/gm/sessions">Sessions</Link> (an
              alle Beteiligten auf einmal) oder unter{" "}
              <Link href="/gm/campaign">Kampagne</Link> (einzeln, auch als
              Korrektur).
            </p>
          </section>

          {/* Eingeklappt als Vorgabe: das Journal ist die längste Sektion der
              Seite und schob Regelwerk und Konten-Übersicht weit nach unten.
              <details> statt eines eigenen Zustands — kein Client-Bundle
              nötig, und der Browser merkt sich nichts, was der Server nicht
              weiß (gleiches Muster wie der Rollen-Editor unter /admin). */}
          <details className="flex flex-col gap-[12px]">
            <summary className="cursor-pointer">
              <h2 className="inline text-lcars-primary">Alle Buchungen</h2>
              <span className="text-lcars-ink-dim text-[13px]">
                {" "}
                · {ledger.length} Einträge
              </span>
            </summary>
            <div className="mt-[12px]">
              <ApLedgerTable entries={ledger} limit={AP_LEDGER_LIMIT} />
            </div>
          </details>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary">Regelwerk</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Gilt ab sofort für alle Charakterbögen: Kosten der Steigerungen,
              Budgets der Ersterschaffung und die Vorbelegung der Vergabe.
              Bereits gebuchte AP bleiben unberührt — nur was künftig gesteigert
              wird, rechnet mit den neuen Zahlen.
            </p>
            <AdvancementRulesForm rules={rules} />
          </section>
        </div>
      </article>
    </>
  );
}

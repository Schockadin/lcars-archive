import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import {
  listApLedger,
  listApAccountSummaries,
  AP_LEDGER_LIMIT,
  listApBalances,
} from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listActiveCharactersForAp, listCompletableMissions } from "@/lib/gameSessions";
import ApLedgerTable from "./ApLedgerTable";
import HelpHeading from "@/components/help/HelpHeading";
import { GmApGuide } from "@/components/help/guides/GmGuides";
import ApAwardPanel from "../campaign/ApAwardPanel";
import MissionApPanel from "../campaign/MissionApPanel";

export const metadata: Metadata = {
  title: "AP",
  robots: { index: false, follow: false },
};

// Gesamtübersicht über alle AP-Bewegungen plus der Regel-Editor. Vergeben
// wird weiterhin unter „AP" (Einzelbuchungen) bzw. „Sessions"
// (Sammelgutschrift) — hier geht es ums Nachvollziehen und ums Regelwerk.
export default async function GmApPage() {
  await requireGM();

  const [accounts, ledger, rules, balances, characters, missions] = await Promise.all([
    listApAccountSummaries(),
    listApLedger(),
    getAdvancementRules(),
    listApBalances(),
    listActiveCharactersForAp(),
    listCompletableMissions(),
  ]);
  const balanceById = new Map(balances.map((entry) => [entry.characterId, entry.available]));
  const awardCharacters = characters.map((character) => ({ ...character, available: balanceById.get(character.id) ?? 0 }));

  return (
    <>
      <PageMeta title="AP" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <HelpHeading
          eyebrow="Zugriff · Spielleitung"
          title="Erfahrungspunkte"
          helpTitle="Leitung · AP"
          tutorial="spielleitung-admins"
        >
          <GmApGuide />
        </HelpHeading>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">AP vergeben</h2>
            <ApAwardPanel characters={awardCharacters} rules={rules} />
            <h3 className="text-lcars-primary-ink">Mission abschließen</h3>
            <MissionApPanel missions={missions} characters={characters} defaultMissionAp={rules.apPerMission} />
          </section>
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">AP-Konten</h2>
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
              Für Sammelvergaben an alle Beteiligten nutze die Session-Erfassung.
            </p>
          </section>

          {/* Eingeklappt als Vorgabe: das Journal ist die längste Sektion der
              Seite und schob Regelwerk und Konten-Übersicht weit nach unten.
              <details> statt eines eigenen Zustands — kein Client-Bundle
              nötig, und der Browser merkt sich nichts, was der Server nicht
              weiß (gleiches Muster wie der Rollen-Editor unter /admin). */}
          <details className="lcars-details flex flex-col gap-[12px]">
            <summary className="lcars-details-summary">
              {/* Chevron links wie bei den Sessions (/gm/sessions) — dreht
                  sich über details[open] (siehe shared.css). */}
              <span
                className="lcars-data-row-chevron"
                style={{ margin: "0 4px 0 2px" }}
                aria-hidden="true"
              />
              <h2 className="inline text-lcars-primary-ink">Vergabe-Historie</h2>
              <span className="text-lcars-ink-dim text-[13px]">
                {" "}
                · {ledger.length} Einträge
              </span>
            </summary>
            <div className="mt-[12px]">
              <ApLedgerTable entries={ledger} limit={AP_LEDGER_LIMIT} />
            </div>
          </details>

        </div>
      </article>
    </>
  );
}

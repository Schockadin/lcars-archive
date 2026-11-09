import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { getAdminContentStats } from "@/lib/contentViews";
import ContentViewsTable from "./ContentViewsTable";
import StatsChart from "./StatsChart";

export const metadata: Metadata = {
  title: "Statistiken",
  robots: { index: false, follow: false },
};

export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await getAdminContentStats();

  const cards = [
    { label: "Inhaltsaufrufe · 7 Tage", value: stats.viewsLastWeek },
    { label: "Aktive Leser:innen · 7 Tage", value: stats.uniqueViewersLastWeek },
    { label: "Neue Konten · 7 Tage", value: stats.signupsLastWeek },
    { label: "Konten gesamt", value: stats.totalAccounts },
  ];

  return (
    <>
      <PageMeta title="Statistiken" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Statistiken</h1>

        <div className="lcars-text flex flex-col gap-[24px]">
          <section
            aria-label="Kennzahlen der letzten sieben Tage"
            className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4"
          >
            {cards.map((card) => (
              <div
                key={card.label}
                className="lcars-panel flex flex-col gap-[8px] p-[16px]"
              >
                <h2 className="lcars-eyebrow text-[12px]">{card.label}</h2>
                <p className="text-lcars-primary-ink text-[28px] leading-none tabular-nums">
                  {card.value.toLocaleString("de-DE")}
                </p>
              </div>
            ))}
          </section>

          <section className="lcars-panel flex flex-col gap-[12px] p-[16px]">
            <h2 className="text-lcars-primary-ink">Aufrufe und Anmeldungen</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Entwicklung der letzten sieben Kalendertage. Die Balken zeigen
              Inhaltsaufrufe angemeldeter Konten und neu angelegte Konten pro
              Tag. Anonyme Besuche und Link-Prefetches werden nicht erfasst;
              die Aufzeichnung beginnt mit Aktivierung dieser Funktion.
            </p>
            <StatsChart daily={stats.daily} />
          </section>

          <section className="lcars-panel flex flex-col gap-[12px] p-[16px]">
            <h2 className="text-lcars-primary-ink">
              Aufrufe nach Inhaltstyp
            </h2>
            {stats.viewsByType.length === 0 ? (
              <p className="text-lcars-ink-dim text-[13px]">
                In den letzten sieben Tagen wurden noch keine Inhaltsaufrufe
                erfasst.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-[8px] sm:grid-cols-2 xl:grid-cols-4">
                {stats.viewsByType.map((item) => (
                  <li
                    key={item.contentType}
                    className="flex items-center justify-between gap-[12px] rounded-lcars-pill bg-lcars-surface px-[14px] py-[8px]"
                  >
                    <span>{CONTENT_TYPE_LABELS[item.contentType]}</span>
                    <strong className="tabular-nums">
                      {item.count.toLocaleString("de-DE")}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-[12px]">
            <div>
              <h2 className="text-lcars-primary-ink">
                Gesehene Inhalte und Nutzer:innen
              </h2>
              <p className="mt-[4px] text-lcars-ink-dim text-[13px]">
                Letzte 30 Tage, höchstens 500 Aufrufe. Das Protokoll wird nach
                90 Tagen automatisch gelöscht. Die Erfassung beginnt mit der
                Aktivierung dieser Funktion; ältere Aufrufe sind nicht enthalten.
              </p>
            </div>
            <ContentViewsTable rows={stats.recentViews} />
          </section>
        </div>
      </article>
    </>
  );
}

const CONTENT_TYPE_LABELS = {
  character: "Charaktere",
  mission: "Missionen",
  mission_log: "Missionsberichte",
  archive_entry: "Archiv-Einträge",
} as const;

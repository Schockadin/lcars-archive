import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { listRecentServerErrors } from "@/lib/errorLog";
import ServerErrorLogTable from "./ServerErrorLogTable";

export const metadata: Metadata = {
  title: "Fehler-Log",
  robots: { index: false, follow: false },
};

// Rein lesende Übersicht der zuletzt geloggten Serverfehler (siehe
// src/lib/errorLog.ts, geschrieben aus src/instrumentation.ts sowie
// bestehenden catch-Blöcken via logCaughtError) — gleiches Muster wie
// /admin/audit-log: Server-Component lädt, dünner Client-Wrapper definiert
// die Spalten für AdminLogTable (Server Components können keine Funktionen
// als Props übergeben).
export default async function AdminErrorLogPage() {
  await requireAdmin();

  const entries = await listRecentServerErrors();

  return (
    <>
      <PageMeta title="Fehler-Log" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Fehler-Log</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Die letzten {entries.length} geloggten Serverfehler — sowohl nicht
            abgefangene Abstürze (Route/Render/Action, zeigen der betroffenen
            Person die 500-Seite) als auch bereits an Ort und Stelle
            abgefangene, unkritische Fehler (Typ „caught“, z.B. fehlgeschlagene
            Benachrichtigungs-Mails).
          </p>
          <ServerErrorLogTable entries={entries} />
        </div>
      </article>
    </>
  );
}

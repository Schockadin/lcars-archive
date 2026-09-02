import { getDBStats } from "@/lib/stats";
import LcarsDataRow from "@/components/lcars/DataRow";

export default async function LandingStats() {
  const { characterCount, sessionCount, entryCount } = await getDBStats();

  return (
    <div className="flex flex-col gap-[8px] mt-[8px]">
      <div className="lcars-eyebrow text-right">Aktueller Datenbestand</div>
      <LcarsDataRow
        value={characterCount}
        label="Charaktere"
        accentColor="var(--lcars-primary-light)"
        color="var(--lcars-tertiary)"
        href="/characters"
      />
      <LcarsDataRow
        value={sessionCount}
        label="Logs"
        color="var(--lcars-secondary)"
        href="/missions"
      />
      <LcarsDataRow
        value={entryCount}
        label="Datenbank-Einträge"
        accentColor="var(--lcars-tertiary)"
        color="var(--lcars-quinary)"
        href="/archive"
      />
      {/* „Jahre" bleibt als reine Kennzahl — die frühere Verlinkung auf
          /timeline entfällt (Timeline-Seite entfernt). */}
      <LcarsDataRow
        value={15}
        label="Jahre"
        color="var(--lcars-primary)"
        accentColor="var(--lcars-quaternary)"
      />
    </div>
  );
}

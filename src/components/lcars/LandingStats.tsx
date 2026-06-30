import { getDBStats } from "@/lib/stats";
import LcarsDataRow from "@/components/lcars/DataRow";

export default async function LandingStats() {
  const { characterCount, sessionCount, entryCount } = await getDBStats();

  return (
    <div className="flex flex-col gap-[8px] mt-[8px]">
      <div className="lcars-eyebrow text-right">Aktueller Datenbestand</div>
      <LcarsDataRow
        value={15}
        label="Jahre"
        color="var(--lcars-amber)"
        accentColor="var(--lcars-orange)"
        href="/"
      />
      <LcarsDataRow
        value={characterCount}
        label="Charaktere"
        accentColor="var(--lcars-amber-light)"
        color="var(--lcars-blue)"
        href="/characters"
      />
      <LcarsDataRow
        value={sessionCount}
        label="Logs"
        color="var(--lcars-purple)"
        href="/missions"
      />
      <LcarsDataRow
        value={entryCount}
        label="Archiv-Einträge"
        accentColor="var(--lcars-blue)"
        color="var(--lcars-red)"
        href="/archive"
      />
    </div>
  );
}

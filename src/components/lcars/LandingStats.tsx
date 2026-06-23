import { getDBStats } from "@/lib/stats";
import LcarsDataRow from "@/components/lcars/DataRow";

export default async function LandingStats() {
  const { characterCount, sessionCount, entryCount, lastSession } =
    await getDBStats();

  return (
    <div className="flex flex-col gap-[8px] mt-[8px]">
      <div className="lcars-eyebrow">Aktueller Datenbestand:</div>
      <LcarsDataRow
        value={15}
        label="Dauer"
        color="var(--lcars-amber)"
        accentColor="var(--lcars-orange)"
        href="/"
      />
      <LcarsDataRow
        value={characterCount}
        label="Charaktere"
        accentColor="var(--lcars-amber-light)"
        color="var(--lcars-blue)"
        href="/charaktere"
      />
      <LcarsDataRow
        value={sessionCount}
        label="Logs"
        color="var(--lcars-purple)"
        href="/missionen"
      />
      {lastSession && (
        <LcarsDataRow
          value=""
          label="Letzter Eintrag"
          color="var(--lcars-orange)"
          accentColor="var(--lcars-purple)"
          href={`/missionen/${lastSession.slug}`}
        />
      )}
      <LcarsDataRow
        value={entryCount}
        label="Archiv"
        accentColor="var(--lcars-blue)"
        color="var(--lcars-red)"
        href="/archiv"
      />
    </div>
  );
}

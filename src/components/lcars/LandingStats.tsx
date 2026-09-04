import { getDBStats } from "@/lib/stats";
import LcarsDataRow from "@/components/lcars/DataRow";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";

export default async function LandingStats() {
  const { characterCount, sessionCount, entryCount } = await getDBStats();

  return (
    <div className="flex flex-col gap-[8px] mt-[8px]">
      <div className="lcars-eyebrow text-right">Aktueller Datenbestand</div>
      <LcarsDataRow
        value={characterCount}
        label="Charaktere"
        color={CONTENT_TYPE_COLOR.character}
        href="/characters"
      />
      <LcarsDataRow
        value={sessionCount}
        label="Logs"
        color={CONTENT_TYPE_COLOR.mission_log}
        href="/missions"
      />
      <LcarsDataRow
        value={entryCount}
        label="Datenbank-Einträge"
        color={CONTENT_TYPE_COLOR.archive_entry}
        href="/archive"
      />
      {/* „Jahre" bleibt als reine Kennzahl — die frühere Verlinkung auf
          /timeline entfällt (Timeline-Seite entfernt). */}
      <LcarsDataRow
        value={15}
        label="Jahre"
      />
    </div>
  );
}

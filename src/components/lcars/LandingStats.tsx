import { getDBStats } from "@/lib/stats";
import LcarsDataRow from "@/components/lcars/DataRow";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import { getCampaignYears } from "@/lib/constants";

export default async function LandingStats() {
  const {
    characterCount,
    sessionCount: missionCount,
    entryCount,
  } = await getDBStats();

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
        value={missionCount}
        label="Logs"
        color={CONTENT_TYPE_COLOR.mission_log}
        href="/chronologie/log"
      />
      <LcarsDataRow
        value={entryCount}
        label="Datenbank-Einträge"
        color={CONTENT_TYPE_COLOR.archive_entry}
        href="/archive"
      />
      <LcarsDataRow
        value={getCampaignYears()}
        label="Jahre"
        href="/chronologie?scope=all"
      />
    </div>
  );
}

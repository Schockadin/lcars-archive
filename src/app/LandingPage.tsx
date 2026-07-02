"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LcarsHorSep } from "@/components/lcars";
import { CAMPAIGN_START_YEAR, getCampaignYears } from "@/lib/constants";

export default function LandingPage({
  stats,
  appVersion,
}: {
  stats: React.ReactNode;
  appVersion: string | null;
}) {
  usePageMeta("Home", "home");

  const campaignYears = getCampaignYears();

  return (
    <div className="flex flex-col py-[10px] items-start max-w-[700px] gap-[8px] pr-[5px]">
      {/* Begrüßungstext */}
      <div className="lcars-eyebrow my-[8px]">
        INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
        {appVersion && ` // V${appVersion}`}
      </div>

      {/* Trennlinie */}
      <LcarsHorSep startColor="var(--lcars-amber)" />

      <div className="flex">
        <div className="lcars-heading">Willkommen im Neo Archiv</div>
      </div>

      {/* Erklärtext */}
      <p className="lcars-body lcars-text">
        Dieses Terminal dokumentiert eine Pen-&-Paper-Kampagne, die seit ca.{" "}
        {CAMPAIGN_START_YEAR} – also seit rund {campaignYears} Jahren – mit
        kleineren Unterbrechungen läuft. Alle Sitzungsberichte, Charaktere und
        Weltendaten werden hier archiviert und durchsuchbar gemacht.
      </p>

      {/* DB-Statistiken / Data-Rows */}
      <div className="flex">{stats}</div>
    </div>
  );
}

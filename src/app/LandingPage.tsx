"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LcarsHorSep } from "@/components/lcars";
import { CAMPAIGN_START_YEAR, getCampaignYears } from "@/lib/constants";
import { HelpTitleRow } from "@/components/help/HelpHeading";

export default function LandingPage({
  stats,
  appVersion,
  help,
}: {
  stats: React.ReactNode;
  appVersion: string | null;
  // Der fertige Hilfe-Knopf samt Anleitung, von der Seite gereicht (siehe
  // help/HelpButton.tsx) — als Prop, damit der Anleitungstext
  // server-gerendert bleibt.
  help?: React.ReactNode;
}) {
  usePageMeta("Home", "home");

  const campaignYears = getCampaignYears();

  return (
    <div className="flex flex-col py-[10px] items-start max-w-[var(--lcars-content-w)] gap-[8px] pr-[5px]">
      {/* Begrüßungstext */}
      <div className="lcars-eyebrow my-[8px]">
        INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
        {appVersion && ` // V${appVersion}`}
      </div>

      {/* Trennlinie */}
      <LcarsHorSep startColor="var(--lcars-primary)" />

      <HelpTitleRow help={help}>
        <div className="lcars-heading">Willkommen im Neo Archiv</div>
      </HelpTitleRow>

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

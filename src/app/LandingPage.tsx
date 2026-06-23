"use client";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function LandingPage({ stats }: { stats: React.ReactNode }) {
  usePageMeta("Home", "home");

  return (
    <div className="flex flex-col py-[10px] items-start max-w-[700px] gap-[8px] pr-[5px]">
      {/* Begrüßungstext */}
      <div className="lcars-eyebrow my-[8px]">
        INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
      </div>

      {/* Trennlinie */}
      <div
        style={{
          width: "100%",
          height: "2px",
          background:
            "linear-gradient(to right, var(--lcars-amber), 75%, var(--lcars-bg)",
        }}
      />
      <div className="flex">
        <div className="lcars-heading">Willkommen im Neo Archiv</div>
      </div>

      {/* Erklärtext */}
      <p>
        Dieses Terminal dokumentiert eine Pen-&-Paper-Kampagne, die seit ca.
        2011 mit kleineren Unterbrechungen läuft. Alle Sitzungsberichte,
        Charaktere und Weltendaten werden hier archiviert und sind durchsuchbar.
      </p>

      {/* DB-Statistiken / Data-Rows */}
      {stats}
    </div>
  );
}

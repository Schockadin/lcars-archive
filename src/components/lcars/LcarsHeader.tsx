"use client";
import { useNeo } from "@/hooks/useNeo";

export default function LcarsHeader({
  headerBox,
}: {
  headerBox: React.ReactNode;
}) {
  const { title } = useNeo();

  return (
    <header className="flex w-full h-[var(--lcars-header-h)]">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="flex flex-col w-[var(--lcars-bar-width)] h-full">
          <div className="w-full h-[150px] bg-[var(--lcars-amber)] mb-[5px]" />
          <div className="lcars-elbow-top flex-grow" />
        </div>

        {/* Header Content */}
        <div className="flex flex-col h-full w-full bg-[var(--lcars-blue)]">
          <div className="lcars-header-content">
            <div className="flex flex-col justify-between items-start h-full ml-[64px]">
              <div className="flex flex-col justify-start">
                <div className="lcars-eyebrow">
                  INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
                </div>
                <h1>{`LCARS / ${title}`}</h1>
              </div>
              <div>{headerBox}</div>
            </div>
          </div>

          {/* LCARS BAR */}
          <div className="lcars-elbow-bar">
            <div className="w-[35%] h-[20px] bg-[var(--lcars-blue)] mr-[5px]" />
            <div className="w-[5%] h-[20px] bg-[var(--lcars-amber)] mr-[5px]" />
            <div className="w-[20%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
            <div className="w-[35%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
            <div className="w-[5%] h-[20px] bg-[var(--lcars-red)]" />
          </div>
        </div>
      </div>
    </header>
  );
}

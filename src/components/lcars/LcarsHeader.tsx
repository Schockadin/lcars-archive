"use client";
import { useNeo } from "@/hooks/useNeo";

export default function LcarsHeader({
  headerBox,
}: {
  headerBox: React.ReactNode;
}) {
  const { title } = useNeo();

  return (
    <header className="w-full h-[var(--lcars-header-h)] bg-red-500">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="flex flex-col w-[var(--lcars-bar-width)] shrink-0">
          <div className="w-full h-[150px] bg-[var(--lcars-amber)] mb-[5px]" />
          <div className="lcars-elbow-top flex-grow" />
        </div>

        {/* Header Content */}
        <div className="flex flex-col h-full flex-1 min-w-0 bg-[var(--lcars-blue)]">
          <div className="lcars-header-content">
            <div className="flex flex-col justify-between items-start h-full ml-[64px] min-w-0">
              <div className="flex flex-col justify-start">
                <div className="lcars-eyebrow">
                  INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
                </div>
                <div className="lcars-header-title">{`LCARS / ${title}`}</div>
              </div>
              {/* <div className="min-w-0 overflow-hidden">{headerBox}</div> */}
            </div>
          </div>
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

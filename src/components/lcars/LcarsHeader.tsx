"use client";
import LcarsMenuItem from "./LcarsMenuItem";
import { useNeo } from "@/hooks/useNeo";
import { MAIN_NAV } from "@/lib/nav";

export default function LcarsHeader() {
  const { title, activeSection } = useNeo();

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
            <div className="flex flex-col justify-center items-end mr-[10px]">
              <div className="lcars-header-text">{`LCARS / ${title}`}</div>
              <div className="grid grid-cols-2 justify-center items-center h-[50%] w-auto">
                {MAIN_NAV.map(
                  (nav) =>
                    nav.id != "00" && (
                      <LcarsMenuItem
                        id={nav.id}
                        text={nav.label}
                        href={nav.href}
                        key={nav.id}
                        active={activeSection === nav.href.split("/")[1]}
                        type="pill"
                      />
                    ),
                )}
              </div>
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

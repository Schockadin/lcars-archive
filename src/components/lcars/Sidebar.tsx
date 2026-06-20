"use client";
import { useNeo } from "@/hooks/useNeo";
import { MAIN_NAV } from "@/lib/nav";
import LcarsMenuItem from "./LcarsMenuItem";

export default function Sidebar() {
  const { activeSection } = useNeo();
  return (
    <aside className="lcars-sidebar h-full sticky top-[0px]">
      {/* Sidebar Top */}
      <div className="flex flex-col w-[var(--lcars-bar-width)] h-[var(--lcars-header-h)] mb-[5px]">
        <div className="w-full h-[150px] bg-[var(--lcars-amber)] mb-[5px]" />
        <div className="lcars-elbow-top flex-grow" />
      </div>

      {/* Sidebar Bottom */}
      <div className="flex sticky top-[0px] flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="lcars-elbow-bottom h-[150px]" />
          <div className="mt-[5px] flex flex-col flex-1 min-h-0">
            {MAIN_NAV.map((nav) => (
              <LcarsMenuItem
                id={nav.id}
                text={nav.label}
                href={nav.href}
                key={nav.id}
                active={activeSection === nav.href.split("/")[1]}
                type="bar"
              />
            ))}
          </div>
        </div>
        {/* Inner Corner */}
        <div
          style={{
            marginBottom: "auto",
            height: "var(--lcars-elbow-size)",
            marginTop: "20px",
            backgroundColor: "var(--lcars-red)",
          }}
        >
          <div
            className="h-[var(--lcars-elbow-size)] bg-[var(--lcars-bg)]"
            style={{
              borderRadius: "64px 0 0 0",
              width: "var(--lcars-elbow-size)",
            }}
          />
        </div>
      </div>
    </aside>
  );
}

"use client";
import { useNeo } from "@/hooks/useNeo";
import { MAIN_NAV } from "@/lib/nav";
import LcarsMenuItem from "./LcarsMenuItem";

export default function LcarsSidebar() {
  const { activeSection } = useNeo();

  return (
    <aside className="lcars-sidebar">
      <div className="flex flex-col">
        <div className="lcars-elbow-bottom" />
        <div className="mt-[5px]">
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
      <div
        style={{
          marginBottom: "auto",
          height: "calc(100% - 20px)",
          marginTop: "20px",
          backgroundColor: "var(--lcars-red)",
        }}
      >
        {/* <div className="h-full w-full bg-[var(--lcars-red)]" /> */}
        <div
          className="h-full bg-[var(--lcars-bg)]"
          style={{
            borderRadius: "64px 0 0 0",
            width: "var(--lcars-elbow-size)",
          }}
        />
      </div>
    </aside>
  );
}

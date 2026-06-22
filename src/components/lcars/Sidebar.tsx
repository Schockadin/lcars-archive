"use client";
import SideBarMenu from "./SidebarMenu";

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-[var(--lcars-sidebar-w)] h-full border-1">
      {/* Linke Seite */}
      <div className="flex flex-col h-full w-[var(--lcars-bar-width)]">
        {/* Sidebar Top */}
        <div className="flex flex-col w-[var(--lcars-bar-width)] h-[var(--lcars-sidebar-header-h)] mb-[5px]">
          <div className="w-full h-[150px] bg-[var(--lcars-amber)] mb-[5px]" />
          <div className="lcars-elbow-top flex-grow" />
        </div>

        {/* Sidebar Bottom */}
        <div className="w-full h-full"></div>
        {/* <SideBarMenu /> */}
      </div>
    </aside>
  );
}

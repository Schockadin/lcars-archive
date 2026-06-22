"use client";
import SideBarMenu from "./SidebarMenu";

export default function Sidebar() {
  return (
    <aside className="flex w-[var(--lcars-sidebar-w)] h-[100dvh] sticky top-[0px]">
      {/* Linke Seite */}
      <div className="flex flex-col h-full w-[var(--lcars-bar-width)]">
        {/* Sidebar Top */}
        <div className="flex flex-col w-[var(--lcars-bar-width)] h-[var(--lcars-sidebar-header-h)] mb-[5px]">
          <div className="w-full h-[150px] bg-[var(--lcars-amber)] mb-[5px]" />
          <div className="lcars-elbow-top flex-grow" />
        </div>

        {/* Sidebar Bottom */}
        <SideBarMenu />
      </div>

      {/* Rechte Seite */}
      <div className="w-full h-full flex flex-col">
        {/* Top */}
        <div className="w-full h-[var(--lcars-sidebar-header-h)] bg-[var(--lcars-blue)]">
          <div className="w-full h-[var(--lcars-header-h)] bg-[var(--lcars-bg)] rounded-bl-[60px]" />
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-blue)]" />
        </div>

        {/* Bottom */}
        <div className="w-full h-full bg-[var(--lcars-red)] mt-[5px] flex flex-col">
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-red)]" />
          <div className="w-full flex-grow bg-[var(--lcars-bg)] rounded-tl-[60px]" />
        </div>
      </div>
    </aside>
  );
}

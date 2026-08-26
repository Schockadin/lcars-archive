import { Suspense } from "react";
import SideBarMenu from "./SidebarMenu";
import SidebarMenuFallback from "./SidebarMenuFallback";

export default function Sidebar() {
  return (
    <aside className="lcars-sidebar flex w-[var(--lcars-sidebar-w)] h-[100svh]">
      {/* Linke Seite */}
      <div className="lcars-sidebar-navcol flex flex-col h-full w-[var(--lcars-bar-width)] gap-[5px]">
        {/* Sidebar Header (rein dekorativ) */}
        <div className="lcars-sidebar-deco flex flex-col w-[var(--lcars-bar-width)] h-[var(--lcars-sidebar-header-h)] gap-[5px]">
          <div className="w-full h-[150px] bg-[var(--lcars-quaternary)]" />
          <div className="lcars-elbow-top" />
        </div>

        {/* Sidebar Main — usePathname (Aktiv-Markierung) braucht unter
            cacheComponents auf dynamischen Routen eine Suspense-Grenze; der
            Fallback zeigt die Navigation ohne Highlight bis zur Hydration. */}
        <Suspense fallback={<SidebarMenuFallback />}>
          <SideBarMenu />
        </Suspense>

        {/* Sidebar Footer (rein dekorativ) */}
        <div
          className="lcars-sidebar-deco lcars-elbow-top"
          style={{
            width: "100%",
            backgroundColor: "var(--lcars-secondary)",
          }}
        />
      </div>

      {/* Rechte Seite (rein dekorativ) */}
      <div className="lcars-sidebar-deco w-full h-full flex flex-col gap-[5px]">
        {/* Sidebar Header */}
        <div className="w-full h-[var(--lcars-sidebar-header-h)] bg-[var(--lcars-tertiary)]">
          <div className="w-full h-[var(--lcars-header-h)] bg-[var(--lcars-bg)] rounded-bl-[60px]" />
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-tertiary)]" />
        </div>

        {/* Sidebar Main */}
        <div className="w-full h-full bg-[var(--lcars-quinary)] flex flex-col">
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-quinary)]" />
          <div className="w-full flex-grow bg-[var(--lcars-bg)] rounded-tl-[60px]" />
        </div>

        {/* Sidebar Footer */}
        <div className="w-full h-[var(--lcars-sidebar-header-h)] bg-[var(--lcars-secondary)]">
          <div className="w-full h-[var(--lcars-header-h)] bg-[var(--lcars-bg)] rounded-bl-[60px]" />
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-secondary)]" />
        </div>
      </div>
    </aside>
  );
}

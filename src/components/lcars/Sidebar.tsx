"use client";
import { CSSProperties } from "react";
import SideBarMenu from "./SidebarMenu";

export interface SidebarProps {
  style?: CSSProperties | undefined;
  className?: string | null;
}

export default function Sidebar() {
  return (
    <aside className="flex w-[var(--lcars-sidebar-w)] h-[100svh]">
      {/* Linke Seite */}
      <div className="flex flex-col h-full w-[var(--lcars-bar-width)] gap-[5px]">
        {/* Sidebar Header */}
        <div className="flex flex-col w-[var(--lcars-bar-width)] h-[var(--lcars-sidebar-header-h)] gap-[5px]">
          <div className="w-full h-[150px] bg-[var(--lcars-orange)] mb-[5px]" />
          <div className="lcars-elbow-top" />
        </div>

        {/* Sidebar Main */}
        <SideBarMenu />

        {/* Sidebar Footer */}
        <div
          className="lcars-elbow-top"
          style={{
            width: "100%",
            backgroundColor: "var(--lcars-purple)",
          }}
        />
      </div>

      {/* Rechte Seite */}
      <div className="w-full h-full flex flex-col gap-[5px]">
        {/* Sidebar Header */}
        <div className="w-full h-[var(--lcars-sidebar-header-h)] bg-[var(--lcars-blue)]">
          <div className="w-full h-[var(--lcars-header-h)] bg-[var(--lcars-bg)] rounded-bl-[60px]" />
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-blue)]" />
        </div>

        {/* Sidebar Main */}
        <div className="w-full h-full bg-[var(--lcars-red)] mt-[5px] flex flex-col">
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-red)]" />
          <div className="w-full flex-grow bg-[var(--lcars-bg)] rounded-tl-[60px]" />
        </div>

        {/* Sidebar Footer */}
        <div className="w-full h-[var(--lcars-sidebar-header-h)] bg-[var(--lcars-purple)]">
          <div className="w-full h-[var(--lcars-header-h)] bg-[var(--lcars-bg)] rounded-bl-[60px]" />
          <div className="w-full h-[var(--lcars-bar-h)] bg-[var(--lcars-purple)]" />
        </div>
      </div>
    </aside>
  );
}

export function ContentSidebar({ style, className }: SidebarProps) {
  return (
    <aside
      className={`flex w-[var(--lcars-elbow-size)] h-[100%] bg-lcars-amber ${className}`}
      style={style}
    ></aside>
  );
}

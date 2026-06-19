import Link from "next/link";
import type { CSSProperties } from "react";

export interface MenuItemProps {
  text: string;
  href: string;
  id: string;
  active: boolean;
  type: MENU_ITEM_TYPE;
  style?: CSSProperties;
}

export type MENU_ITEM_TYPE = "bar" | "pill";

export default function LcarsMenuItem({
  text,
  href,
  id,
  active,
  type,
  style,
}: MenuItemProps) {
  return (
    <Link
      href={href}
      style={{
        marginBottom: "5px",
        textDecoration: "none",
      }}
    >
      <div
        className={`flex lcars-menu-${type} ${active ? "lcars-menu-active" : ""} h-full w-full`}
        style={style}
      >
        <div className="lcars-menu-id">{id}</div>
        <div className="lcars-menu-text">-{text}</div>
      </div>
    </Link>
  );
}

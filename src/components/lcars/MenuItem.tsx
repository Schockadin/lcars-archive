import Link from "next/link";
import type { CSSProperties } from "react";

type MenuItemType = "bar" | "pill";

interface MenuItemProps {
  text?: string;
  href: string;
  id?: string;
  active?: boolean;
  type: MenuItemType;
  style?: CSSProperties;
}

export default function MenuItem({
  text = "",
  href,
  id = "",
  active = false,
  type,
  style,
}: MenuItemProps) {
  return (
    <Link
      href={href}
      className="flex-1 min-h-0 flex"
      style={{
        textDecoration: "none",
      }}
    >
      <div
        className={`flex lcars-menu-${type} ${active ? "lcars-menu-active" : ""}`}
        style={style}
      >
        {id && <div className="lcars-menu-id">{id}</div>}
        {text && <div className="lcars-menu-text">-{text}</div>}
      </div>
    </Link>
  );
}

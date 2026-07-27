import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type MenuItemType = "bar" | "pill";

interface MenuItemProps {
  text?: string;
  href: string;
  id?: string;
  active?: boolean;
  type: MenuItemType;
  style?: CSSProperties;
  // Optionales Icon: auf schmalen Screens (Menütext ausgeblendet) wird es
  // statt der bloßen Nummer angezeigt, damit die Ziele wiedererkennbar
  // bleiben (siehe header.css, .lcars-menu-icon).
  icon?: ReactNode;
}

export default function MenuItem({
  text = "",
  href,
  id = "",
  active = false,
  type,
  style,
  icon,
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
        {icon && (
          <div className="lcars-menu-icon" aria-hidden="true">
            {icon}
          </div>
        )}
        {id && <div className="lcars-menu-id">{id}</div>}
        {text && <div className="lcars-menu-text">-{text}</div>}
      </div>
    </Link>
  );
}

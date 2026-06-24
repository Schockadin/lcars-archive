export type NavKey =
  | "home"
  | "characters"
  | "missions"
  | "archive"
  | "timeline"
  | "impressum"
  | "dsgvo";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { id: "00", label: "Home", href: "/home" },
  { id: "01", label: "Charaktere", href: "/characters" },
  { id: "02", label: "Missionen", href: "/missions" },
  { id: "03", label: "Archiv", href: "/archive" },
  { id: "04", label: "Timeline", href: "/timeline" },
];

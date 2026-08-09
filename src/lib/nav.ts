export type NavKey =
  | "home"
  | "characters"
  | "missions"
  | "archive"
  // /search hat einen eigenen Nav-Link (Lupe, siehe MAIN_NAV); /timeline hat
  // keinen Nav-Link mehr, bleibt aber per URL erreichbar und braucht daher
  // weiterhin einen gültigen section-Wert für <PageMeta>.
  | "timeline"
  | "search"
  // /rag, /login und /user haben keinen eigenen Nav-Link, brauchen aber einen
  // gültigen section-Wert für <PageMeta>.
  | "rag"
  | "login"
  | "users"
  | "impressum"
  | "dsgvo"
  | "tutorial"
  | "changelog";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { id: "00", label: "Home", href: "/" },
  { id: "01", label: "Charaktere", href: "/characters" },
  { id: "02", label: "Missionen", href: "/missions" },
  { id: "03", label: "Archiv", href: "/archive" },
  // Suche ersetzt den früheren Timeline-Eintrag im Hauptmenü (Lupe-Icon, siehe
  // SidebarMenu.tsx). Die Suchseite zeigt oben die Volltextsuche und darunter
  // den Archiv-Assistenten (für Berechtigte).
  { id: "04", label: "Suche", href: "/search" },
];

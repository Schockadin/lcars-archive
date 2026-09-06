export type NavKey =
  | "home"
  | "characters"
  | "missions"
  | "archive"
  | "chronologie"
  // /search hat einen eigenen Nav-Link (Lupe, siehe MAIN_NAV). /rag, /login
  // und /user haben keinen eigenen Nav-Link, brauchen aber einen gültigen
  // section-Wert für <PageMeta>.
  | "search"
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
  // Die Chronologie ist zugleich die Missions-Übersicht: in der Vorgabe zeigt
  // sie je Einsatz seinen Beginn und führt von dort auf die Missionsseite,
  // auf Wunsch den vollen Zeitstrahl. Der frühere eigene Punkt „Missionen"
  // (/missions) ist deshalb entfallen; die Route leitet hierher um.
  { id: "02", label: "Chronologie", href: "/chronologie" },
  // Label „Datenbank" statt „Archiv" — die Route bleibt /archive (und damit
  // auch der NavKey "archive" sowie alle bestehenden Links/Lesezeichen).
  { id: "03", label: "Datenbank", href: "/archive" },
  // Die Suchseite zeigt oben die Volltextsuche und darunter den
  // Archiv-Assistenten (für Berechtigte).
  { id: "04", label: "Suche", href: "/search" },
];

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
  { id: "02", label: "Missionen", href: "/missions" },
  // Label „Datenbank" statt „Archiv" — die Route bleibt /archive (und damit
  // auch der NavKey "archive" sowie alle bestehenden Links/Lesezeichen).
  { id: "03", label: "Datenbank", href: "/archive" },
  // Die Chronologie stellt dieselben Inhalte nach ihrer eigenen Zeitrechnung
  // dar (In-Story-Datum), nicht nach Bearbeitungszeit.
  { id: "04", label: "Chronologie", href: "/chronologie" },
  // Die Suchseite zeigt oben die Volltextsuche und darunter den
  // Archiv-Assistenten (für Berechtigte).
  { id: "05", label: "Suche", href: "/search" },
];

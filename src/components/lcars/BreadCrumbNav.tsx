"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Breadcrumbs werden NUR für Pfade angezeigt, die mit einem
// dieser Präfixe beginnen. Neue Sektionen müssen hier bewusst
// eingetragen werden — Impressum, DSGVO, 404 etc. fallen raus.
const BREADCRUMB_PREFIXES: string[] = ["/characters", "/missions", "/archive"];

// Statische Label-Map für Sektions-Slugs die nicht automatisch
// korrekt formatiert werden können
const LABEL_MAP: Record<string, string> = {
  characters: "Charaktere",
  missions: "Missionen",
  archive: "Archiv",
  locations: "Orte",
  items: "Items",
  factions: "Fraktionen",
  species: "Spezies",
  events: "Ereignisse",
  lore: "Lore",
};

function slugToLabel(slug: string): string {
  if (LABEL_MAP[slug]) return LABEL_MAP[slug];
  // "tanghal-iv" → "Tanghal IV", "sitzung-3" → "Sitzung 3"
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface Crumb {
  label: string;
  href: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean); // ["missionen", "tanghal-iv", "sitzung-3"]

  return segments.map((segment, index) => ({
    label: slugToLabel(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));
}

// Prüft ob der aktuelle Pfad unter einem der erlaubten Präfixe liegt.
function isAllowed(pathname: string): boolean {
  return BREADCRUMB_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export default function BreadcrumbNav() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  // Auf der Root-Seite keine Breadcrumbs anzeigen
  if (crumbs.length === 0) return null;

  // Nur Whitelist-Einträge anzeigen
  if (!isAllowed(pathname)) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "16px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span
            key={crumb.href}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {index > 0 && (
              <span style={{ color: "var(--lcars-amber)", opacity: 0.5 }}>
                ›
              </span>
            )}
            {isLast ? (
              // Aktuelle Seite: kein Link, Amber-Farbe
              <span style={{ color: "var(--lcars-amber)" }}>{crumb.label}</span>
            ) : (
              // Übergeordnete Seite: Link, gedimmt
              <Link
                href={crumb.href}
                style={{
                  color: "var(--lcars-text)",
                  textDecoration: "none",
                  transition: "color 150ms",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--lcars-text-dim)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--lcars-text)")
                }
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

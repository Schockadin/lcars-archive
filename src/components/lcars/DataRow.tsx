import { DataRowPill, type DataRowPillProps } from "./DataRowPill";
import { DataRowAccordion } from "./DataRowAccordion";

interface DataRowProps extends DataRowPillProps {
  // Nur relevant mit children (Akkordeon-Modus) — Startzustand, siehe unten.
  defaultOpen?: boolean;
  // Undefined = normale (ggf. verlinkte) DataRow. Gesetzt = Akkordeon: die
  // Zeile wird zum Auf-/Zuklapp-Trigger, children erscheinen darunter.
  children?: React.ReactNode;
}

// Zweigleisig statt zwei getrennter Komponenten (früher DataRow + Accordion
// mit dupliziertem Zeilen-Markup): ohne children eine gewöhnliche (ggf.
// verlinkte) Zeile, mit children ein Akkordeon — Kopfzeile klappt den
// übergebenen Inhalt auf/zu, standardmäßig eingeklappt (siehe defaultOpen,
// z.B. "Meine Inhalte" in UserContentBrowser.tsx). Bewusst selbst KEINE
// Client Component: die häufigere, kinderlose Variante ist rein statisch
// (DataRowPill braucht keinen State) und bleibt dadurch server-renderbar —
// nur der Akkordeon-Zweig (DataRowAccordion) lädt eigenes Client-JS.
export default function DataRow({
  value,
  label,
  color = "var(--lcars-secondary)",
  accentColor = "var(--lcars-primary)",
  labelColor = "var(--lcars-text-contrast)",
  href,
  className = "",
  expanded,
  defaultOpen,
  children,
}: DataRowProps) {
  if (children === undefined) {
    return (
      <DataRowPill
        value={value}
        label={label}
        color={color}
        accentColor={accentColor}
        labelColor={labelColor}
        href={href}
        className={className}
        expanded={expanded}
      />
    );
  }

  return (
    <DataRowAccordion
      value={value}
      label={label}
      color={color}
      accentColor={accentColor}
      labelColor={labelColor}
      className={className}
      defaultOpen={defaultOpen}
    >
      {children}
    </DataRowAccordion>
  );
}

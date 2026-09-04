import { DataRowPill, type DataRowPillProps } from "./DataRowPill";
import { DataRowAccordion } from "./DataRowAccordion";

interface DataRowProps extends DataRowPillProps {
  // Nur relevant mit children (Akkordeon-Modus) — Startzustand, siehe unten.
  defaultOpen?: boolean;
  // Anker-id (nur Akkordeon-Modus): wird auf den Wrapper gesetzt, sodass
  // /pfad#<id> auf diesen Abschnitt springt UND ihn beim Laden aufklappt
  // (siehe DataRowAccordion). Genutzt von der Anleitung für die
  // Changelog-Deep-Links (src/lib/tutorialSections.ts).
  htmlId?: string;
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
  labelColor = "var(--lcars-ink-contrast)",
  href,
  className = "",
  expanded,
  defaultOpen,
  htmlId,
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
      htmlId={htmlId}
    >
      {children}
    </DataRowAccordion>
  );
}

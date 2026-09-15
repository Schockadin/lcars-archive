import type { ReactNode } from "react";

// Der gemeinsame Baukasten aller Schema-Bilder in den Anleitungen — erst nur
// für die Charaktererschaffung gebaut (siehe
// character/CharacterCreationFigures.tsx), jetzt geteilt mit den Anleitungen
// zu den Bereichen des Leitungs-, Profil- und Besucher-Menüs (siehe
// help/figures/).
//
// Bewusst Inline-SVG statt Screenshots:
//   • Ein Screenshot veraltet mit der ersten Layout-Änderung und niemand
//     merkt es; ein Schema zeigt ohnehin nur die Anordnung.
//   • Die Farben kommen aus den Theme-Tokens (var(--lcars-…)), die Bilder
//     machen also jedes Farbschema und den Hellmodus mit — ein PNG nicht.
//   • Keine Binärdateien im Repo, nichts, was geladen werden muss, und in
//     jeder Größe scharf.
//
// Wie der Rest der Anleitungen: reines JSX ohne Hooks und ohne "use client",
// damit dieselbe Datei server-gerendert (im /tutorial) und im Client-Fenster
// (auf den Bereichsseiten) läuft.
//
// viewBox statt fester Maße: Die Bilder skalieren mit ihrer Spalte — auf dem
// Telefon volle Breite unter dem Text, auf dem Desktop schmal daneben (das
// Raster steckt in GuideSection).

// Bildfläche + Bildunterschrift. Das SVG bekommt eine echte Beschriftung
// (role="img" + aria-label), damit es für Screenreader nicht als Dekoration
// verschwindet — die Bildunterschrift steht ohnehin sichtbar darunter.
export function GuideFigure({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col gap-[6px]">
      <svg
        viewBox="0 0 200 110"
        role="img"
        aria-label={label}
        className="w-full max-w-[280px] rounded-[6px] border border-lcars-border bg-lcars-surface-2"
      >
        {children}
      </svg>
      <figcaption className="text-lcars-ink-dim font-lcars-mono text-[11px]">
        {caption}
      </figcaption>
    </figure>
  );
}

// Farben als Kürzel — jedes Bild greift auf dieselben Tokens zu.
export const PRIMARY = "var(--lcars-primary)";
export const SECONDARY = "var(--lcars-secondary)";
export const TERTIARY = "var(--lcars-tertiary)";
export const QUATERNARY = "var(--lcars-quaternary)";
export const QUINARY = "var(--lcars-quinary)";
export const SENARY = "var(--lcars-senary)";
export const BORDER = "var(--lcars-border)";
export const INK_DIM = "var(--lcars-ink-dim)";

// Eine „Textzeile" als graues Balkenstück — in allen Bildern dasselbe Mittel,
// damit sie als eine Familie lesbar sind.
export function Line({
  x,
  y,
  w,
  h = 4,
  fill = INK_DIM,
  opacity = 0.5,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={h / 2}
      fill={fill}
      opacity={opacity}
    />
  );
}

// Eine Knopf-Pille. Kommt in fast jedem Schema vor („Speichern",
// „Übernehmen", „Eintragen") und stand vorher in jedem Bild einzeln da.
export function Pill({
  x,
  y,
  w,
  h = 11,
  fill = BORDER,
  opacity,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={h / 2}
      fill={fill}
      opacity={opacity}
    />
  );
}

// Ein Kasten (Eingabefeld, Karte, Tabellenzelle) — nur Umriss, damit er sich
// von den gefüllten Knöpfen unterscheidet.
export function Box({
  x,
  y,
  w,
  h,
  stroke = BORDER,
  fill = "none",
  rx = 4,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: string;
  fill?: string;
  rx?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      fill={fill}
      stroke={stroke}
      strokeWidth={1.5}
    />
  );
}

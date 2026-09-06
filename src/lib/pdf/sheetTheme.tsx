// Die gemeinsame Optik der Ausdrucke: Farben und die Auszeichnung von
// Textstücken.
//
// Der Charakterbogen gibt sie vor — seine Zusatzblätter sind dem gedruckten
// Formular nachempfunden (blauer Rahmen mit runden Ecken, Kopfzeile aus
// Wortmarke und Titelreiter, gesperrte Versalien über einer dünnen Linie).
// Die Missionsakte trägt seit v1.29.36 dieselbe Aufmachung, damit die Mappe
// am Tisch aus einem Guss ist. Damit die Werte nicht in zwei Dateien
// auseinanderlaufen, stehen sie hier.
//
// Die Maße bleiben bewusst bei den Dokumenten: der Bogen rechnet in
// Bildschirm-Pixeln seiner Vorlage (PT_PER_PX), die Akte in Punkten auf A4 —
// dieselben Zahlen hätten dort verschiedene Größen.
import { Text } from "@react-pdf/renderer";
import type { PdfSpan } from "./markdownBlocks";

// Aus der Grafik des gedruckten Bogens entnommen.
export const SHEET_INK = "#555555";
export const SHEET_BLUE = "#3f84b5";
export const SHEET_BLUE_DIM = "#8fb4d0";
// Die Akzentfarbe zu 20 % auf Weiß — dasselbe Ergebnis wie opacity: 0.2 am
// Bildschirm. @react-pdf reicht opacity nicht in SVG durch, deshalb die
// ausgerechnete Farbe.
export const SHEET_BLUE_FADED = "#d8e6f0";
// Nebentext (Kategorien, Datumszeilen, Blattfuß).
export const SHEET_MUTED = "#8a8a8a";

// Ein Textstück mit seiner Auszeichnung. @react-pdf kennt kein <strong>, wohl
// aber verschachtelte <Text> mit eigener Schriftfamilie — Helvetica bringt
// Fett, Kursiv und beides von Haus aus mit, es muss nichts eingebettet werden.
export function spanFamily(span: PdfSpan): string {
  if (span.code) return "Courier";
  if (span.bold && span.italic) return "Helvetica-BoldOblique";
  if (span.bold) return "Helvetica-Bold";
  if (span.italic) return "Helvetica-Oblique";
  return "Helvetica";
}

export function Spans({ spans }: { spans: PdfSpan[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <Text key={index} style={{ fontFamily: spanFamily(span) }}>
          {span.text}
        </Text>
      ))}
    </>
  );
}

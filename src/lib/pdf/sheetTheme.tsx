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
import { StyleSheet, Text, View } from "@react-pdf/renderer";
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

// Gemeinsamer A4-Rahmen für alle textbasierten Akten-Exporte. Inhaltsexport,
// Missionsakte und zusätzliche Charakterdokumente sollen wie Seiten derselben
// Mappe wirken, nicht wie unabhängig gestaltete PDF-Dateien.
export const ARCHIVE_SHEET_STYLES = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 54,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    color: SHEET_INK,
  },
  docFrame: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: SHEET_BLUE,
    borderRadius: 18,
  },
  mast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  wordmark: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: 14,
    letterSpacing: 1,
    color: SHEET_BLUE,
  },
  tab: {
    backgroundColor: SHEET_BLUE,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 3,
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: 4,
  },
  bannerRule: {
    height: 2,
    backgroundColor: SHEET_BLUE_DIM,
    marginTop: 2,
    marginBottom: 10,
  },
  subline: {
    fontSize: 9,
    color: SHEET_BLUE,
    marginBottom: 12,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: SHEET_MUTED,
  },
});

export function ArchiveSheetHeader({
  tab,
  subline,
  campaignTitle = "Neo Archive",
}: {
  tab: string;
  subline: string;
  campaignTitle?: string;
}) {
  return (
    <>
      <View style={ARCHIVE_SHEET_STYLES.docFrame} fixed />
      <View style={ARCHIVE_SHEET_STYLES.mast}>
        <Text style={ARCHIVE_SHEET_STYLES.wordmark}>
          {campaignTitle.toUpperCase()}
        </Text>
        <Text style={ARCHIVE_SHEET_STYLES.tab}>{tab}</Text>
      </View>
      <View style={ARCHIVE_SHEET_STYLES.bannerRule} />
      <Text style={ARCHIVE_SHEET_STYLES.subline}>{subline}</Text>
    </>
  );
}

export function ArchiveSheetFooter({ title }: { title: string }) {
  return (
    <View style={ARCHIVE_SHEET_STYLES.footer} fixed>
      <Text>{title}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

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

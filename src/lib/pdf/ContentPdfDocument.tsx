// Der Einzel-Export eines Inhalts als PDF (Eintrag „Als PDF exportieren" im
// Teilen-Menü, siehe ShareMenu.tsx) — Archiv-Eintrag/Dialog, Mission,
// Missionslog oder Charakter.
//
// Aufmachung wie Charakterbogen und Missionsakte (blauer Rahmen mit runden
// Ecken, Kopfzeile aus Wortmarke und Titelreiter, gesperrte Versalien über
// einer dünnen Linie) — Farben und die Auszeichnung der Textstücke kommen aus
// sheetTheme.tsx, damit die drei Ausdrucke nicht auseinanderlaufen. Vorher war
// dieser Export ein schlichtes Fließtext-Dokument mit schwarzer Helvetica und
// grauer Trennlinie; neben einer Missionsakte auf dem Tisch sah das aus wie
// aus einem anderen Archiv.
//
// Maße in Punkten auf A4 — dieselben Zahlen wie in der Missionsakte, die
// ebenfalls gelesen und abgeheftet statt als Formular-Faksimile gedruckt wird.
//
// Wie die übrigen Exporte mit @react-pdf/renderer (reine Node-Bibliothek ohne
// Chromium, läuft dadurch auf Netlify Functions). Markdown zerlegt
// toPdfBlocks — @react-pdf kennt kein HTML, ein gerendertes content-Feld
// nützte hier also nichts.
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { toPdfBlocks } from "./markdownBlocks";
import {
  SHEET_BLUE,
  SHEET_BLUE_DIM,
  SHEET_INK,
  SHEET_MUTED,
  Spans,
} from "./sheetTheme";
import type { ExportableContent, ExportContentType } from "@/lib/contentExport";

const styles = StyleSheet.create({
  // Innerhalb des Rahmens (siehe docFrame), wie in der Missionsakte:
  // Blattrand plus die Innenabstände des Rahmens.
  page: {
    paddingTop: 50,
    // Platz für die auf jeder Seite wiederholte Fußzeile.
    paddingBottom: 54,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    color: SHEET_INK,
  },
  // Der Rahmen als eigenes, absolut gesetztes und `fixed` wiederholtes
  // Element: ein umschließender View mit Rahmen kann in @react-pdf nicht über
  // Seiten hinweg fließen, der Rahmen risse am Seitenumbruch ab.
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
  // Kopfzeile wie auf dem Bogen: die Kampagne links (dort die Wortmarke), der
  // Titelreiter rechts (dort „PERSONNEL FILE").
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
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 1,
    color: SHEET_BLUE,
    marginBottom: 2,
  },
  // Abschnittsüberschrift: gesperrte Versalien über einer dünnen Linie, wie
  // in der Missionsakte.
  section: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: SHEET_BLUE,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: SHEET_BLUE_DIM,
    borderBottomStyle: "solid",
  },
  // Die Angaben aus dem Frontmatter: Beschriftung und Wert in einer Zeile,
  // die Beschriftung in gesperrten Versalien wie die Feldnamen des Bogens.
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 120,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: SHEET_BLUE,
  },
  metaValue: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
    color: SHEET_MUTED,
  },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: SHEET_BLUE,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 7,
  },
  listItem: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 3,
    marginLeft: 10,
  },
  quote: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 7,
    marginLeft: 10,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: SHEET_BLUE_DIM,
    borderLeftStyle: "solid",
    color: SHEET_BLUE,
  },
  empty: {
    fontSize: 10,
    color: SHEET_MUTED,
    fontFamily: "Helvetica-Oblique",
  },
  // Blattfuß wie auf dem Bogen: klein und grau, auf jeder Seite wiederholt —
  // mit Seitenzahl, weil auch ein einzelner Eintrag mehrseitig werden kann.
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

// Der Titelreiter oben rechts — dieselbe Rolle wie „MISSION"/„LOGBUCH" in der
// Missionsakte, hier nach Inhaltsart.
const TAB_LABEL: Record<ExportContentType, string> = {
  archive_entry: "ARCHIV",
  mission: "MISSION",
  mission_log: "LOGBUCH",
  character: "PERSONAL",
};

// Die Zeile unter der Linie: nennt die Art des Ausdrucks im Klartext.
const TYPE_LABEL: Record<ExportContentType, string> = {
  archive_entry: "Archiv-Eintrag",
  mission: "Missionsakte",
  mission_log: "Einsatzbericht",
  character: "Personalakte",
};

export function contentTab(type: ExportContentType): string {
  return TAB_LABEL[type];
}

export function contentSubline(
  type: ExportContentType,
  title: string,
): string {
  return `${title} — ${TYPE_LABEL[type]}`;
}

// Deutsche Beschriftungen der Frontmatter-Schlüssel. Bis hierher standen die
// rohen Schlüssel im PDF („started_at", „session_nr") — im Ausdruck neben
// einer Missionsakte liest das niemand als Formularfeld. Unbekannte Schlüssel
// bleiben stehen, statt sie zu verschlucken.
const FRONTMATTER_LABELS: Record<string, string> = {
  slug: "Kennung",
  category: "Kategorie",
  tags: "Schlagworte",
  summary: "Kurzfassung",
  attributes: "Merkmale",
  characters: "Charaktere",
  missions: "Missionen",
  participants: "Beteiligt",
  location: "Ort",
  logDate: "Datum",
  setting: "Rahmen",
  status: "Status",
  started_at: "Beginn",
  ended_at: "Ende",
  teaser: "Anreißer",
  mission: "Mission",
  mission_title: "Mission",
  author: "Autor",
  session_nr: "Session",
  log_date: "Datum",
  rank: "Rang",
  species: "Spezies",
  homeworld: "Heimatwelt",
  age: "Alter",
  affiliation: "Zugehörigkeit",
  aliases: "Aliasse",
  generation: "Generation",
  joined_at: "An Bord seit",
  left_at: "Ausgeschieden",
};

// „title" steht schon als Überschrift auf dem Blatt, „type" schon im
// Titelreiter — beide noch einmal als Datenzeile wäre doppelt.
const SKIPPED_FRONTMATTER_KEYS = new Set(["title", "type"]);

export function frontmatterLabel(key: string): string {
  return FRONTMATTER_LABELS[key] ?? key;
}

// Reduziert einen beliebigen Frontmatter-Wert auf eine druckbare Zeile —
// null/leere Werte werden vom Aufrufer schon vorher gefiltert (siehe
// formatFrontmatterLines).
function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (
      value.every(
        (v) => v && typeof v === "object" && "label" in v && "value" in v,
      )
    ) {
      return (value as { label: string; value: string }[])
        .map((v) => `${v.label}: ${v.value}`)
        .join(" · ");
    }
    return value.map((v) => String(v)).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${frontmatterLabel(k)}: ${v}`)
      .join(" · ");
  }
  return String(value);
}

export function formatFrontmatterLines(
  frontmatter: Record<string, unknown>,
): { key: string; label: string; text: string }[] {
  return Object.entries(frontmatter)
    .filter(([key]) => !SKIPPED_FRONTMATTER_KEYS.has(key))
    .filter(
      ([, value]) =>
        value != null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    )
    .map(([key, value]) => ({
      key,
      label: frontmatterLabel(key),
      text: formatValue(value),
    }))
    .filter((line) => line.text !== "");
}

function Blocks({ markdown }: { markdown: string }) {
  const blocks = toPdfBlocks(markdown);
  if (blocks.length === 0) {
    return <Text style={styles.empty}>(kein Text hinterlegt)</Text>;
  }
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <Text key={index} style={styles.heading}>
              {block.text.toUpperCase()}
            </Text>
          );
        }
        if (block.kind === "listItem") {
          return (
            <Text key={index} style={styles.listItem}>
              • <Spans spans={block.spans} />
            </Text>
          );
        }
        if (block.kind === "quote") {
          return (
            <Text key={index} style={styles.quote}>
              <Spans spans={block.spans} />
            </Text>
          );
        }
        return (
          <Text key={index} style={styles.paragraph}>
            <Spans spans={block.spans} />
          </Text>
        );
      })}
    </>
  );
}

// Name der Kampagne — steht klein über dem Titel, damit ein ausgedrucktes
// Blatt zuzuordnen ist. Wie in der Missionsakte.
const CAMPAIGN_TITLE = "Neo Archive";

// Einziger Einstiegspunkt, den die Route (route.ts, kein JSX) braucht —
// hält JSX vollständig in dieser .tsx-Datei.
export async function renderContentPdf(
  content: ExportableContent,
  type: ExportContentType,
): Promise<Buffer> {
  return renderToBuffer(<ContentPdfDocument content={content} type={type} />);
}

function ContentPdfDocument({
  content,
  type,
}: {
  content: ExportableContent;
  type: ExportContentType;
}) {
  const metaLines = formatFrontmatterLines(content.frontmatter);

  return (
    <Document
      title={content.title}
      author={CAMPAIGN_TITLE}
      creator={CAMPAIGN_TITLE}
    >
      <Page size="A4" style={styles.page} bookmark={content.title}>
        <View style={styles.docFrame} fixed />
        <View style={styles.mast}>
          <Text style={styles.wordmark}>{CAMPAIGN_TITLE.toUpperCase()}</Text>
          <Text style={styles.tab}>{contentTab(type)}</Text>
        </View>
        <View style={styles.bannerRule} />
        <Text style={styles.subline}>
          {contentSubline(type, content.title)}
        </Text>

        <Text style={styles.title}>{content.title.toUpperCase()}</Text>

        {metaLines.length > 0 && (
          <>
            <Text style={styles.section}>DATEN</Text>
            {metaLines.map((line) => (
              <View key={line.key} style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {line.label.toUpperCase()}
                </Text>
                <Text style={styles.metaValue}>{line.text}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.section}>TEXT</Text>
        <Blocks markdown={content.bodyMarkdown} />

        <View style={styles.footer} fixed>
          <Text>{content.title}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

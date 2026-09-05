// Der Kampagnenband als PDF: Titelseite, Inhaltsverzeichnis, danach je
// Mission ihre Beschreibung und alle Logbücher in zeitlicher Folge.
//
// Wie die übrigen Exporte mit @react-pdf/renderer (reine Node-Bibliothek ohne
// Chromium, läuft dadurch auf Netlify Functions). Markdown zerlegt
// toPdfBlocks — @react-pdf kennt kein HTML, das gerenderte content-Feld nützt
// hier also nichts.
//
// Optik bewusst wie ContentPdfDocument (Helvetica, dunkles Grau auf Weiß) und
// NICHT wie der Charakterbogen: der Bogen ist ein Faksimile eines gedruckten
// Formulars, der Band ist ein Fließtext-Dokument zum Lesen.
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { toPdfBlocks } from "./markdownBlocks";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import type { MissionStatus } from "@/types/missions";
import type { CampaignBook, CampaignBookLog } from "@/lib/campaignBook";

const ACCENT = "#3f84b5";
const INK = "#1a1a1a";
const INK_DIM = "#666666";

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 56,
    paddingHorizontal: 54,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: INK,
  },
  titlePage: {
    padding: 54,
    fontFamily: "Helvetica",
    color: INK,
    justifyContent: "center",
  },
  bookTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 30,
    letterSpacing: 2,
    color: ACCENT,
    marginBottom: 10,
  },
  bookSubtitle: {
    fontSize: 13,
    color: INK_DIM,
    marginBottom: 28,
  },
  bookMeta: {
    fontSize: 10,
    color: INK_DIM,
    lineHeight: 1.6,
  },
  tocTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 1,
    color: ACCENT,
    marginBottom: 14,
  },
  tocEntry: {
    marginBottom: 7,
  },
  tocMission: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  tocMeta: {
    fontSize: 9,
    color: INK_DIM,
    marginTop: 1,
  },
  tocLog: {
    fontSize: 9,
    color: INK_DIM,
    marginLeft: 14,
    marginTop: 1,
  },
  missionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: ACCENT,
    marginBottom: 3,
  },
  missionMeta: {
    fontSize: 9,
    color: INK_DIM,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    borderBottomStyle: "solid",
  },
  logTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginTop: 16,
    marginBottom: 2,
  },
  logMeta: {
    fontSize: 9,
    color: INK_DIM,
    marginBottom: 6,
  },
  // Nicht-öffentliche Logbücher werden gekennzeichnet, damit ein
  // weitergereichter Ausdruck nicht ungewollt Verborgenes verbreitet.
  logNotice: {
    fontSize: 8,
    color: ACCENT,
    marginBottom: 6,
  },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 7,
  },
  listItem: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 3,
    marginLeft: 12,
  },
  quote: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 7,
    marginLeft: 10,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    borderLeftStyle: "solid",
    color: ACCENT,
  },
  empty: {
    fontSize: 10,
    color: INK_DIM,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: INK_DIM,
  },
});

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Die Kopfzeile einer Mission: Zeitraum und Status, was davon bekannt ist.
// Exportiert, weil die Zusammensetzung der Zeile (Zeitraum, deutscher Status,
// Anzahl im Singular/Plural) für sich prüfbar ist — siehe die Tests daneben.
export function missionMetaLine(mission: {
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  logs: unknown[];
}): string {
  const parts: string[] = [];
  const from = formatDate(mission.startedAt);
  const to = formatDate(mission.endedAt);
  if (from && to && from !== to) parts.push(`${from} – ${to}`);
  else if (from) parts.push(from);
  else if (to) parts.push(to);
  if (mission.status) {
    // Der Status steht in der Datenbank englisch; im Band die deutsche
    // Beschriftung der Übersicht — unbekannte Werte unverändert, statt sie
    // zu verschlucken.
    parts.push(
      STATUS_CONFIG[mission.status as MissionStatus]?.label ?? mission.status,
    );
  }
  parts.push(
    mission.logs.length === 1 ? "1 Logbuch" : `${mission.logs.length} Logbücher`,
  );
  return parts.join(" · ");
}

export function logMetaLine(log: CampaignBookLog): string {
  const parts: string[] = [];
  if (log.sessionNr != null) parts.push(`Session ${log.sessionNr}`);
  const date = formatDate(log.logDate);
  if (date) parts.push(date);
  if (log.authorName) parts.push(log.authorName);
  return parts.join(" · ");
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
              {block.text}
            </Text>
          );
        }
        if (block.kind === "listItem") {
          return (
            <Text key={index} style={styles.listItem}>
              • {block.text}
            </Text>
          );
        }
        if (block.kind === "quote") {
          return (
            <Text key={index} style={styles.quote}>
              {block.text}
            </Text>
          );
        }
        return (
          <Text key={index} style={styles.paragraph}>
            {block.text}
          </Text>
        );
      })}
    </>
  );
}

function Footer({ title }: { title: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{title}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export interface CampaignBookPdfInput {
  book: CampaignBook;
  // Name der Kampagne (Einstellungen) — steht auf der Titelseite.
  campaignTitle: string;
  // Wer den Band gezogen hat; im Ausdruck vermerkt, weil der Inhalt von der
  // Sichtbarkeit dieser Person abhängt.
  requestedBy: string | null;
  // Absolute Adresse der Instanz, damit die Verweise im Band anklickbar sind.
  baseUrl: string;
}

function CampaignBookDocument({ input }: { input: CampaignBookPdfInput }) {
  const { book, campaignTitle } = input;
  const generated = book.generatedAt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Kampagnenband ${campaignTitle}`}
      author="Neo-Archiv"
      creator="Neo-Archiv"
    >
      <Page size="A4" style={styles.titlePage}>
        <Text style={styles.bookTitle}>KAMPAGNENBAND</Text>
        <Text style={styles.bookSubtitle}>{campaignTitle}</Text>
        <Text style={styles.bookMeta}>
          {book.missions.length === 1
            ? "1 Mission"
            : `${book.missions.length} Missionen`}
          {" · "}
          {book.logCount === 1 ? "1 Logbuch" : `${book.logCount} Logbücher`}
          {"\n"}
          Stand: {generated}
          {input.requestedBy ? `\nZusammengestellt für: ${input.requestedBy}` : ""}
          {"\n\n"}
          Der Band enthält, was die anfordernde Person lesen darf — nicht
          öffentliche Logbücher sind im Text als solche gekennzeichnet.
        </Text>
      </Page>

      <Page size="A4" style={styles.page} bookmark="Inhalt">
        <Text style={styles.tocTitle}>INHALT</Text>
        {book.missions.length === 0 && (
          <Text style={styles.empty}>
            Es gibt noch keine veröffentlichten Missionen.
          </Text>
        )}
        {book.missions.map((mission) => (
          <View key={mission.slug} style={styles.tocEntry} wrap={false}>
            <Text style={styles.tocMission}>{mission.title}</Text>
            <Text style={styles.tocMeta}>{missionMetaLine(mission)}</Text>
            {mission.logs.map((log) => (
              <Text key={log.slug} style={styles.tocLog}>
                {log.title}
                {logMetaLine(log) ? ` — ${logMetaLine(log)}` : ""}
              </Text>
            ))}
          </View>
        ))}
        <Footer title={campaignTitle} />
      </Page>

      {book.missions.map((mission) => (
        // Jede Mission beginnt auf einer neuen Seite — im Band soll man
        // blättern können, ohne dass zwei Einsätze auf einer Seite kleben.
        <Page
          key={mission.slug}
          size="A4"
          style={styles.page}
          bookmark={mission.title}
        >
          <Text style={styles.missionTitle}>{mission.title}</Text>
          <Text style={styles.missionMeta}>{missionMetaLine(mission)}</Text>
          <Blocks markdown={mission.sourceMarkdown} />

          {mission.logs.map((log) => (
            <View key={log.slug}>
              <Text style={styles.logTitle}>{log.title}</Text>
              {logMetaLine(log) !== "" && (
                <Text style={styles.logMeta}>{logMetaLine(log)}</Text>
              )}
              {log.visibility !== "public" && (
                <Text style={styles.logNotice}>
                  {log.visibility === "gm"
                    ? "Nur für die Spielleitung sichtbar"
                    : "Nicht öffentlich sichtbar"}
                </Text>
              )}
              <Blocks markdown={log.sourceMarkdown} />
              <Link
                src={`${input.baseUrl}/missions/${mission.slug}/${log.slug}`}
                style={styles.logMeta}
              >
                Im Archiv lesen
              </Link>
            </View>
          ))}

          {mission.logs.length === 0 && (
            <Text style={styles.empty}>
              Zu dieser Mission ist (für dich) kein Logbuch hinterlegt.
            </Text>
          )}

          <Footer title={campaignTitle} />
        </Page>
      ))}
    </Document>
  );
}

// Einziger Einstiegspunkt für die Route (route.ts kennt kein JSX).
export async function renderCampaignBookPdf(
  input: CampaignBookPdfInput,
): Promise<Buffer> {
  return renderToBuffer(<CampaignBookDocument input={input} />);
}

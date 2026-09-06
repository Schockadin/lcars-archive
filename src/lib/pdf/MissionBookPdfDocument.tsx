// Die Missionsakte als PDF: Titelblatt, Inhaltsverzeichnis, die Beschreibung
// der Mission und ihre Logbücher in zeitlicher Folge.
//
// Aufmachung wie der Charakterbogen (blauer Rahmen mit runden Ecken,
// Kopfzeile aus Kampagnenname und Titelreiter, gesperrte Versalien über einer
// dünnen Linie) — Farben und die Auszeichnung der Textstücke kommen aus
// sheetTheme.tsx, damit beide Ausdrucke nicht auseinanderlaufen. Vorher war
// die Akte ein schlichtes Fließtext-Dokument; nebeneinander auf dem Tisch sah
// das aus wie zwei verschiedene Archive.
//
// Maße bleiben in Punkten auf A4: die Akte wird gelesen und abgeheftet, der
// Bogen ist ein Faksimile eines Letter-Formulars.
//
// Wie die übrigen Exporte mit @react-pdf/renderer (reine Node-Bibliothek ohne
// Chromium, läuft dadurch auf Netlify Functions). Markdown zerlegt
// toPdfBlocks — @react-pdf kennt kein HTML, das gerenderte content-Feld nützt
// hier also nichts.
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
import {
  SHEET_BLUE,
  SHEET_BLUE_DIM,
  SHEET_INK,
  SHEET_MUTED,
  Spans,
} from "./sheetTheme";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import type { MissionStatus } from "@/types/missions";
import type { MissionBook, MissionBookLog } from "@/lib/missionBook";
import { missionLogHref } from "@/lib/contentRoutes";

const styles = StyleSheet.create({
  // Innerhalb des Rahmens (siehe docFrame), wie auf den Zusatzblättern des
  // Charakterbogens: Blattrand plus die Innenabstände des Rahmens.
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
  // Titelblatt: derselbe Rahmen, aber der Titel steht mittig auf dem Blatt.
  titlePage: {
    paddingTop: 50,
    paddingBottom: 54,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    color: SHEET_INK,
    justifyContent: "center",
  },
  bookTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 26,
    letterSpacing: 1.5,
    color: SHEET_BLUE,
    marginBottom: 22,
  },
  bookSubtitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: SHEET_MUTED,
    marginBottom: 8,
  },
  bookMeta: {
    fontSize: 10,
    color: SHEET_MUTED,
    lineHeight: 1.6,
  },
  // Abschnittsüberschrift: gesperrte Versalien über einer dünnen Linie, wie
  // die des Spickzettels.
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
  meta: {
    fontSize: 9,
    color: SHEET_MUTED,
    marginBottom: 8,
  },
  // Ein Eintrag des Inhaltsverzeichnisses: Kasten mit runden Ecken wie ein
  // Talent auf dem Spickzettel, damit die Verzeichnisseite nicht als lose
  // Liste aus der Mappe fällt.
  tocItem: {
    marginBottom: 7,
    padding: 8,
    borderWidth: 1,
    borderColor: SHEET_BLUE_DIM,
    borderStyle: "solid",
    borderRadius: 6,
  },
  tocTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: SHEET_BLUE,
  },
  tocMeta: {
    fontSize: 8,
    color: SHEET_MUTED,
    marginTop: 2,
  },
  tocHint: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: SHEET_MUTED,
    marginBottom: 8,
  },
  // Überschrift eines Berichts: wie der Name eines Talents, nur größer.
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    color: SHEET_BLUE,
    marginBottom: 2,
  },
  // Nicht-öffentliche Logbücher werden gekennzeichnet, damit ein
  // weitergereichter Ausdruck nicht ungewollt Verborgenes verbreitet.
  notice: {
    fontSize: 8,
    color: SHEET_BLUE,
    marginBottom: 6,
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
  link: {
    fontSize: 8.5,
    color: SHEET_BLUE,
    marginTop: 10,
  },
  // Blattfuß wie auf dem Bogen: klein und grau, auf jeder Seite wiederholt —
  // hier mit Seitenzahl, weil die Akte geblättert und abgeheftet wird.
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

export function logMetaLine(log: MissionBookLog): string {
  const parts: string[] = [];
  if (log.sessionNr != null) parts.push(`Session ${log.sessionNr}`);
  const date = formatDate(log.logDate);
  if (date) parts.push(date);
  if (log.authorName) parts.push(log.authorName);
  return parts.join(" · ");
}

// Sprungziel eines Berichts. Die Einträge des Inhaltsverzeichnisses verweisen
// per <Link src="#…"> darauf (in @react-pdf ein PDF-„goTo", kein
// Web-Link) — der Slug ist dafür eindeutig genug und schon da.
export function logAnchor(slug: string): string {
  return `log-${slug}`;
}

const MISSION_ANCHOR = "mission";

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

// Die Kopfzeile jeder Seite außer dem Titelblatt: Rahmen, Kampagne,
// Titelreiter, Linie und darunter der Missionstitel.
function SheetHead({
  campaignTitle,
  tab,
  subline,
}: {
  campaignTitle: string;
  tab: string;
  subline: string;
}) {
  return (
    <>
      <View style={styles.docFrame} fixed />
      <View style={styles.mast}>
        <Text style={styles.wordmark}>{campaignTitle.toUpperCase()}</Text>
        <Text style={styles.tab}>{tab}</Text>
      </View>
      <View style={styles.bannerRule} />
      <Text style={styles.subline}>{subline}</Text>
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

export interface MissionBookPdfInput {
  book: MissionBook;
  // Name der Kampagne — steht klein über dem Missionstitel, damit ein
  // ausgedrucktes Blatt zuzuordnen ist.
  campaignTitle: string;
  // Wer die Akte gezogen hat; im Ausdruck vermerkt, weil der Inhalt von der
  // Sichtbarkeit dieser Person abhängt.
  requestedBy: string | null;
  // Absolute Adresse der Instanz, damit die Verweise in der Akte anklickbar
  // sind.
  baseUrl: string;
}

function MissionBookDocument({ input }: { input: MissionBookPdfInput }) {
  const { book, campaignTitle } = input;
  const generated = book.generatedAt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Missionsakte ${book.title}`}
      author="Neo-Archiv"
      creator="Neo-Archiv"
    >
      <Page size="A4" style={styles.titlePage}>
        <View style={styles.docFrame} />
        <Text style={styles.bookSubtitle}>{campaignTitle.toUpperCase()}</Text>
        <Text style={styles.bookTitle}>{book.title.toUpperCase()}</Text>
        <View style={styles.bannerRule} />
        <Text style={styles.bookMeta}>
          {missionMetaLine(book)}
          {book.participants.length > 0
            ? `\nBeteiligt: ${book.participants.join(" · ")}`
            : ""}
          {"\n"}
          Stand: {generated}
          {input.requestedBy ? `\nZusammengestellt für: ${input.requestedBy}` : ""}
          {"\n\n"}
          Die Akte enthält, was die anfordernde Person lesen darf — nicht
          öffentliche Logbücher sind im Text als solche gekennzeichnet.
        </Text>
      </Page>

      {/* Inhaltsverzeichnis. Ohne Seitenzahlen, dafür anklickbar: wie viele
          Seiten ein Bericht braucht, steht erst beim Setzen fest — eine Zahl
          hier wäre geraten. Die Einträge springen im PDF an ihren Bericht,
          die Lesezeichen des Betrachters führen zu denselben Stellen. */}
      <Page size="A4" style={styles.page} bookmark="Inhalt">
        <SheetHead
          campaignTitle={campaignTitle}
          tab="INHALT"
          subline={`${book.title} — Inhaltsverzeichnis`}
        />
        <Text style={styles.section}>MISSIONSAKTE</Text>
        <Link src={`#${MISSION_ANCHOR}`} style={styles.tocItem}>
          <Text style={styles.tocTitle}>{book.title.toUpperCase()}</Text>
          <Text style={styles.tocMeta}>{missionMetaLine(book)}</Text>
        </Link>

        <Text style={styles.section}>LOGBÜCHER</Text>
        {book.logs.length === 0 ? (
          <Text style={styles.empty}>
            Zu dieser Mission ist (für dich) kein Logbuch hinterlegt.
          </Text>
        ) : (
          <>
            <Text style={styles.tocHint}>
              Jeder Bericht beginnt auf einer neuen Seite; ein Klick auf den
              Eintrag springt dorthin.
            </Text>
            {book.logs.map((log) => (
              <Link
                key={log.slug}
                src={`#${logAnchor(log.slug)}`}
                style={styles.tocItem}
              >
                <Text style={styles.tocTitle}>{log.title.toUpperCase()}</Text>
                {logMetaLine(log) !== "" && (
                  <Text style={styles.tocMeta}>{logMetaLine(log)}</Text>
                )}
                {log.visibility !== "public" && (
                  <Text style={styles.tocMeta}>
                    {log.visibility === "gm"
                      ? "Nur für die Spielleitung sichtbar"
                      : "Nicht öffentlich sichtbar"}
                  </Text>
                )}
              </Link>
            ))}
          </>
        )}
        <Footer title={book.title} />
      </Page>

      <Page size="A4" style={styles.page} bookmark={book.title}>
        <SheetHead
          campaignTitle={campaignTitle}
          tab="MISSION"
          subline={`${book.title} — Missionsakte`}
        />
        <Text id={MISSION_ANCHOR} style={styles.entryTitle}>
          {book.title.toUpperCase()}
        </Text>
        <Text style={styles.meta}>{missionMetaLine(book)}</Text>
        <Blocks markdown={book.sourceMarkdown} />
        <Footer title={book.title} />
      </Page>

      {/* Jedes Logbuch beginnt auf einer neuen Seite: die Akte wird am Tisch
          durchgeblättert, und zwei Berichte auf einer Seite kleben aneinander.
          Das Lesezeichen führt direkt zum jeweiligen Bericht. */}
      {book.logs.map((log) => (
        <Page key={log.slug} size="A4" style={styles.page} bookmark={log.title}>
          <SheetHead
            campaignTitle={campaignTitle}
            tab="LOGBUCH"
            subline={`${book.title} — Einsatzbericht`}
          />
          <Text id={logAnchor(log.slug)} style={styles.entryTitle}>
            {log.title.toUpperCase()}
          </Text>
          {logMetaLine(log) !== "" && (
            <Text style={styles.meta}>{logMetaLine(log)}</Text>
          )}
          {log.visibility !== "public" && (
            <Text style={styles.notice}>
              {log.visibility === "gm"
                ? "Nur für die Spielleitung sichtbar"
                : "Nicht öffentlich sichtbar"}
            </Text>
          )}
          <Blocks markdown={log.sourceMarkdown} />
          <Link
            src={`${input.baseUrl}${missionLogHref(book.slug, log.slug)}`}
            style={styles.link}
          >
            Im Archiv lesen
          </Link>
          <Footer title={book.title} />
        </Page>
      ))}
    </Document>
  );
}

// Einziger Einstiegspunkt für die Route (route.ts kennt kein JSX).
export async function renderMissionBookPdf(
  input: MissionBookPdfInput,
): Promise<Buffer> {
  return renderToBuffer(<MissionBookDocument input={input} />);
}

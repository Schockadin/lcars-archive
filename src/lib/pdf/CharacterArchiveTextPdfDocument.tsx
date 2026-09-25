import "server-only";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CharacterDocumentKind } from "@/lib/characterDocumentTypes";
import { characterDocumentKindLabel } from "@/lib/characterDocumentNames";
import { toPdfBlocks } from "./markdownBlocks";
import {
  ARCHIVE_SHEET_STYLES,
  ArchiveSheetFooter,
  ArchiveSheetHeader,
  SHEET_BLUE,
  SHEET_BLUE_DIM,
  SHEET_MUTED,
  Spans,
} from "./sheetTheme";

const styles = StyleSheet.create({
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 1,
    color: SHEET_BLUE,
    marginBottom: 2,
  },
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
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: SHEET_BLUE,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: { fontSize: 10, lineHeight: 1.5, marginBottom: 7 },
  quote: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 7,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: SHEET_BLUE_DIM,
    borderLeftStyle: "solid",
    color: SHEET_BLUE,
  },
  listItem: { fontSize: 10, lineHeight: 1.5, marginBottom: 3, marginLeft: 10 },
  empty: { fontSize: 10, color: SHEET_MUTED, fontFamily: "Helvetica-Oblique" },
});

function MarkdownText({ text }: { text: string }) {
  return toPdfBlocks(text).map((block, index) => {
    const style =
      block.kind === "heading"
        ? styles.heading
        : block.kind === "quote"
          ? styles.quote
          : block.kind === "listItem"
            ? styles.listItem
            : styles.paragraph;
    return (
      <Text key={index} style={style}>
        {block.kind === "listItem" ? "• " : ""}
        <Spans spans={block.spans} />
      </Text>
    );
  });
}

export async function renderCharacterArchiveTextPdf(input: {
  title: string;
  kind: Exclude<CharacterDocumentKind, "pdf">;
  text: string;
}): Promise<Buffer> {
  const label = characterDocumentKindLabel(input.kind);
  return renderToBuffer(
    <Document title={input.title} author="Neo Archive" creator="Neo Archive">
      <Page size="A4" style={ARCHIVE_SHEET_STYLES.page} bookmark={input.title}>
        <ArchiveSheetHeader
          tab="DOKUMENT"
          subline={`${input.title} — ${label}`}
        />
        <Text style={styles.title}>{input.title.toUpperCase()}</Text>
        <Text style={styles.section}>INHALT</Text>
        {!input.text ? (
          <Text style={styles.empty}>(Kein Text enthalten.)</Text>
        ) : input.kind === "md" ? (
          <MarkdownText text={input.text} />
        ) : (
          <Text style={styles.paragraph}>{input.text}</Text>
        )}
        <ArchiveSheetFooter title={input.title} />
      </Page>
    </Document>,
  );
}

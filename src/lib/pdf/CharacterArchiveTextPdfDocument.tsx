import "server-only";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CharacterDocumentKind } from "@/lib/characterDocumentTypes";
import { toPdfBlocks } from "./markdownBlocks";
import { Spans } from "./sheetTheme";

const styles = StyleSheet.create({
  page: {
    padding: "46 48 52",
    color: "#172033",
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
  },
  eyebrow: { color: "#8b5cf6", fontSize: 8, letterSpacing: 1.4 },
  title: { fontSize: 20, marginTop: 8, marginBottom: 18 },
  rule: { height: 3, backgroundColor: "#f59e0b", marginBottom: 20 },
  heading: { fontSize: 13, marginTop: 10, marginBottom: 5, color: "#334155" },
  paragraph: { marginBottom: 7 },
  quote: {
    marginBottom: 7,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#94a3b8",
    color: "#475569",
  },
  listItem: { marginBottom: 4, paddingLeft: 10 },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 8,
  },
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
  const label = input.kind === "docx" ? "DOCX" : input.kind.toUpperCase();
  return renderToBuffer(
    <Document title={input.title} author="Neo Archive" creator="Neo Archive">
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>
          ZUSÄTZLICHES CHARAKTERDOKUMENT · {label}
        </Text>
        <Text style={styles.title}>{input.title}</Text>
        <View style={styles.rule} />
        {input.kind === "md" ? (
          <MarkdownText text={input.text} />
        ) : (
          <Text style={styles.paragraph}>
            {input.text || "(Kein Text enthalten.)"}
          </Text>
        )}
        <View style={styles.footer} fixed>
          <Text>{input.title}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>,
  );
}

// Einfache, generische PDF-Vorlage für den Content-Export (Archiv-Eintrag/
// Dialog, Mission, Missionslog, Charakter) — bewusst kein Markdown-Renderer:
// @react-pdf/renderer kennt kein HTML/Markdown, nur eigene Document/Page/
// Text/View-Primitive. Absätze werden an Leerzeilen getrennt, Zeilen mit
// führendem "#" (Markdown-Überschrift) fett statt in normaler Textgröße
// dargestellt — ausreichend lesbar, ohne einen vollen Markdown-Parser für
// PDF-Layout zu bauen. Reine Node-Bibliothek ohne Chromium, läuft dadurch
// auf Netlify Functions.
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ExportableContent } from "@/lib/contentExport";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  metaBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1pt solid #cccccc",
  },
  metaLine: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 2,
  },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.4,
  },
  heading: {
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
});

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
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }
  return String(value);
}

function formatFrontmatterLines(
  frontmatter: Record<string, unknown>,
): { key: string; text: string }[] {
  return Object.entries(frontmatter)
    .filter(([, value]) => value != null && value !== "" && !(Array.isArray(value) && value.length === 0))
    .map(([key, value]) => ({ key, text: formatValue(value) }))
    .filter((line) => line.text !== "");
}

// Roher Markdown-Body ohne Renderer — nur an Leerzeilen in Absätze
// getrennt, führendes "#..." wird als Überschrift stilisiert (Raute selbst
// wird entfernt), alles andere bleibt unverändert inkl. übrig gebliebener
// Markdown-Syntax (**fett**, [[Wikilinks]] etc. erscheinen als Klartext).
function renderBody(bodyMarkdown: string) {
  const paragraphs = bodyMarkdown.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((paragraph, i) => {
    const headingMatch = paragraph.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      return (
        <Text key={i} style={styles.heading}>
          {headingMatch[1]}
        </Text>
      );
    }
    return (
      <Text key={i} style={styles.paragraph}>
        {paragraph}
      </Text>
    );
  });
}

// Einziger Einstiegspunkt, den die Route (route.ts, kein JSX) braucht —
// hält JSX vollständig in dieser .tsx-Datei.
export async function renderContentPdf(content: ExportableContent): Promise<Buffer> {
  return renderToBuffer(<ContentPdfDocument content={content} />);
}

function ContentPdfDocument({ content }: { content: ExportableContent }) {
  const metaLines = formatFrontmatterLines(content.frontmatter);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{content.title}</Text>
        {metaLines.length > 0 && (
          <View style={styles.metaBlock}>
            {metaLines.map((line) => (
              <Text key={line.key} style={styles.metaLine}>
                <Text style={styles.metaLabel}>{line.key}: </Text>
                {line.text}
              </Text>
            ))}
          </View>
        )}
        {content.bodyMarkdown.trim() ? (
          renderBody(content.bodyMarkdown)
        ) : (
          <Text style={styles.paragraph}>(Kein Textinhalt.)</Text>
        )}
      </Page>
    </Document>
  );
}

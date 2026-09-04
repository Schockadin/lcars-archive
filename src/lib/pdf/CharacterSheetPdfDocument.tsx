// PDF-Fassung des Charakterbogens zum Ausdrucken: Blatt 1 ist der gedruckte
// Bogen mit den eingesetzten Werten, Blatt 2 (und ggf. weitere) der
// Talent-Spickzettel, Blatt 3 die Biografie — dieselben drei Blätter, die die
// Vorschau auf der Charakterseite zeigt (CharacterSheetPreview.tsx).
//
// Wie beim Content-Export (ContentPdfDocument.tsx) mit @react-pdf/renderer —
// eine reine Node-Bibliothek ohne Chromium, läuft dadurch auf Netlify
// Functions. Die Bogen-Grafik liegt als eingebettetes PNG bei
// (personnelFileArt.ts).
//
// Maßstab: der Bogen ist 816×1056 CSS-Pixel groß, also genau 8,5×11 Zoll bei
// 96 dpi — dasselbe Blatt wie das PDF-Format „Letter" (612×792 pt). Alle Maße
// der Bildschirm-Vorlage (personnelFileLayout.ts) gelten hier deshalb
// unverändert, nur mit PT_PER_PX multipliziert.
/* eslint-disable jsx-a11y/alt-text -- <Image> ist hier die PDF-Primitive von
   @react-pdf/renderer, kein <img>: sie kennt kein alt-Attribut. */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { toPdfBlocks } from "./markdownBlocks";
import {
  ATTRIBUTE_BOXES,
  DEPARTMENT_BOXES,
  DETERMINATION_POINTS,
  HEAD_BOXES,
  LIST_BOXES,
  PHOTO_BOX,
  RESISTANCE_BOX,
  STRESS_VALUE_BOX,
  type Box,
} from "@/lib/personnelFileLayout";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  EXPERIENCE_OPTIONS,
  computeStress,
} from "@/lib/characterStats";
import {
  parseTalentEntry,
  talentCategoryLabel,
  type Talent,
} from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";
import { PERSONNEL_FILE_ART_PNG } from "./personnelFileArt";

const PT_PER_PX = 0.75;
const PAGE_WIDTH = 816 * PT_PER_PX;
const PAGE_HEIGHT = 1056 * PT_PER_PX;

// Farben des gedruckten Bogens (aus der Grafik entnommen).
const INK = "#555555";
const SHEET_BLUE = "#3b7fb0";
const SHEET_BLUE_DIM = "#8fb4d0";

// Markenzeile am Blattfuß — dieselbe wie auf dem gedruckten Bogen (Blatt 1),
// damit Spickzettel und Biografie erkennbar zum selben Dokument gehören.
const SHEET_FOOTER =
  "TM & © 2024 CBS Studios Inc. STAR TREK and related marks and logos " +
  "are trademarks of CBS Studios, Inc. All Rights Reserved.";

function pt(px: number): number {
  return px * PT_PER_PX;
}

function boxStyle(box: Box) {
  return {
    position: "absolute" as const,
    left: pt(box.left),
    top: pt(box.top),
    width: pt(box.width),
    height: pt(box.height),
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    color: INK,
  },
  art: {
    position: "absolute",
    left: 0,
    top: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
  // Feldtext: dieselbe Position und derselbe Innenabstand wie am Bildschirm,
  // damit der Wert unter seiner gedruckten Beschriftung sitzt.
  field: {
    fontSize: pt(10),
    paddingTop: pt(13),
    paddingLeft: pt(7),
    paddingRight: pt(7),
  },
  // Attribute/Disziplinen: rechtsbündig neben der gedruckten Beschriftung.
  stat: {
    fontSize: pt(11),
    textAlign: "right",
    paddingTop: pt(7),
    paddingRight: pt(10),
  },
  listLine: {
    fontSize: pt(10),
    lineHeight: 1.35,
  },
  cheatPage: {
    fontFamily: "Helvetica",
    color: INK,
    paddingTop: pt(48),
    // Platz für die auf jeder Seite wiederholte Markenzeile am Blattfuß.
    paddingBottom: pt(56),
    paddingHorizontal: pt(56),
  },
  // Kopfzeile wie auf dem Bogen: „STAR TREK ADVENTURES" links, der Titelreiter
  // rechts (wie „PERSONNEL FILE").
  cheatMast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: pt(4),
  },
  cheatWordmark: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: pt(15),
    letterSpacing: pt(1),
    color: SHEET_BLUE,
  },
  // Der Titelreiter: weiße Versalien mit Sperrung auf dem Blau der Vorlage.
  cheatTab: {
    backgroundColor: SHEET_BLUE,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: pt(13),
    letterSpacing: pt(3),
    paddingVertical: pt(5),
    paddingHorizontal: pt(14),
    borderRadius: pt(4),
  },
  cheatBannerRule: {
    height: pt(2),
    backgroundColor: SHEET_BLUE_DIM,
    marginTop: pt(2),
    marginBottom: pt(10),
  },
  cheatSubline: {
    fontSize: pt(9),
    color: SHEET_BLUE,
    marginBottom: pt(12),
  },
  // Markenzeile am Blattfuß — dieselbe wie auf dem gedruckten Bogen. Als
  // fixed-Element auf jeder Seite des Zusatzblatts wiederholt.
  cheatFooter: {
    position: "absolute",
    bottom: pt(24),
    left: pt(56),
    right: pt(56),
    textAlign: "center",
    fontSize: pt(6),
    lineHeight: 1.4,
    color: "#9a9aa2",
  },
  // Biografie-Blatt: Fließtext im selben Grau wie der Bogen, Überschriften im
  // Blau der Vorlage.
  bioHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: pt(11),
    letterSpacing: pt(1),
    color: SHEET_BLUE,
    marginTop: pt(10),
    marginBottom: pt(4),
  },
  bioParagraph: {
    fontSize: pt(10),
    lineHeight: 1.5,
    marginBottom: pt(7),
  },
  bioListItem: {
    fontSize: pt(10),
    lineHeight: 1.5,
    marginBottom: pt(3),
    marginLeft: pt(10),
  },
  bioQuote: {
    fontSize: pt(10),
    lineHeight: 1.5,
    marginBottom: pt(7),
    marginLeft: pt(10),
    paddingLeft: pt(8),
    borderLeftWidth: pt(2),
    borderLeftColor: SHEET_BLUE_DIM,
    borderLeftStyle: "solid",
    color: SHEET_BLUE,
  },
  // Ein Talent wie ein Kasten des Bogens: dünne blaue Umrandung mit runden
  // Ecken, die Beschriftung oben links in gesperrten Versalien.
  cheatItem: {
    marginBottom: pt(8),
    padding: pt(8),
    borderWidth: pt(1),
    borderColor: SHEET_BLUE_DIM,
    borderStyle: "solid",
    borderRadius: pt(6),
  },
  cheatName: {
    fontFamily: "Helvetica-Bold",
    fontSize: pt(9),
    letterSpacing: pt(1),
    color: SHEET_BLUE,
  },
  cheatMeta: {
    fontSize: pt(8),
    color: "#8a8a8a",
    marginTop: pt(1),
    marginBottom: pt(3),
  },
  cheatText: {
    fontSize: pt(9),
    lineHeight: 1.4,
  },
});

function experienceLabel(stats: CharacterStats): string {
  const option = EXPERIENCE_OPTIONS.find((o) => o.value === stats.experience);
  return option?.label ?? "";
}

// Ein Kasten mit Freitext (Kopfbereich des Bogens).
function Field({ box, value }: { box: Box; value: string | null }) {
  if (!value) return null;
  return (
    <View style={boxStyle(box)}>
      <Text style={styles.field}>{value}</Text>
    </View>
  );
}

// Ein Listenkasten: je Eintrag eine Zeile. Was nicht mehr in den Kasten passt,
// wird abgeschnitten — genau wie auf dem Papier.
function ListBox({ box, entries }: { box: Box; entries: string[] }) {
  if (entries.length === 0) return null;
  return (
    <View style={{ ...boxStyle(box), overflow: "hidden", paddingTop: pt(17), paddingHorizontal: pt(7) }}>
      {entries.map((entry, index) => (
        <Text key={`${entry}-${index}`} style={styles.listLine}>
          {entry}
        </Text>
      ))}
    </View>
  );
}

export interface CharacterSheetPdfInput {
  name: string;
  rank: string | null;
  species: string | null;
  portrait: string | null;
  stats: CharacterStats;
  // Katalog für den Spickzettel — der Regeltext steht nicht am Charakter.
  talents: Talent[];
  // Biografie als Markdown-Quelltext (characters.source_md). @react-pdf kennt
  // kein HTML, das gerenderte bio-Feld nützt hier also nichts — die einfachen
  // Blöcke daraus baut toPdfBlocks.
  bioMarkdown?: string | null;
}

function SheetPage({ input }: { input: CharacterSheetPdfInput }) {
  const { stats } = input;
  const attributes = stats.attributes as unknown as Record<string, number | null>;
  const departments = stats.departments as unknown as Record<string, number | null>;
  const maxStress = computeStress(stats);

  return (
    <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
      <Image style={styles.art} src={PERSONNEL_FILE_ART_PNG} />

      {/* Das Portrait im Bildkasten oben links. Fehlt es oder ist es nicht
          abrufbar, bleibt der Kasten leer — ein fehlgeschlagener Bild-Download
          darf den Export nicht scheitern lassen (siehe renderCharacterSheetPdf). */}
      {input.portrait && (
        <Image
          style={{ ...boxStyle(PHOTO_BOX), objectFit: "contain" }}
          src={input.portrait}
        />
      )}

      <Field box={HEAD_BOXES.name} value={input.name} />
      <Field box={HEAD_BOXES.pronouns} value={stats.pronouns} />
      <Field box={HEAD_BOXES.rank} value={input.rank} />
      <Field box={HEAD_BOXES.assignment} value={stats.assignment} />
      <Field box={HEAD_BOXES.characterRole} value={stats.characterRole} />
      <Field
        box={HEAD_BOXES.reputation}
        value={stats.reputation === null ? null : String(stats.reputation)}
      />
      <Field
        box={HEAD_BOXES.traits}
        value={[input.species, stats.traits].filter(Boolean).join(" · ") || null}
      />
      <Field box={HEAD_BOXES.environment} value={stats.environment} />
      <Field box={HEAD_BOXES.upbringing} value={stats.upbringing} />
      <Field box={HEAD_BOXES.careerPath} value={stats.careerPath} />
      <Field box={HEAD_BOXES.experience} value={experienceLabel(stats) || null} />
      <Field box={HEAD_BOXES.careerEvent1} value={stats.careerEvents[0] ?? null} />
      <Field box={HEAD_BOXES.careerEvent2} value={stats.careerEvents[1] ?? null} />

      {ATTRIBUTE_FIELDS.map((field) => {
        const value = attributes[field.key];
        if (value === null || value === undefined) return null;
        return (
          <View key={field.key} style={boxStyle(ATTRIBUTE_BOXES[field.key])}>
            <Text style={styles.stat}>{value}</Text>
          </View>
        );
      })}
      {DEPARTMENT_FIELDS.map((field) => {
        const value = departments[field.key];
        if (value === null || value === undefined) return null;
        return (
          <View key={field.key} style={boxStyle(DEPARTMENT_BOXES[field.key])}>
            <Text style={styles.stat}>{value}</Text>
          </View>
        );
      })}

      {stats.resistance !== null && (
        <View style={boxStyle(RESISTANCE_BOX)}>
          <Text style={{ ...styles.stat, paddingTop: pt(11) }}>
            {stats.resistance}
          </Text>
        </View>
      )}
      {maxStress !== null && (
        <View style={boxStyle(STRESS_VALUE_BOX)}>
          <Text
            style={{
              fontSize: pt(11),
              textAlign: "center",
              paddingTop: pt(11),
            }}
          >
            {maxStress}
          </Text>
        </View>
      )}

      {/* Entschlossenheit: gefüllte Kästchen. Die Stress-Reihe bleibt leer —
          sie wird am Spieltisch abgestrichen. */}
      {DETERMINATION_POINTS.slice(0, stats.determination ?? 0).map(
        (point, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              left: pt(point.left + 3),
              top: pt(point.top + 3),
              width: pt(12),
              height: pt(12),
              backgroundColor: SHEET_BLUE,
            }}
          />
        ),
      )}

      <ListBox box={LIST_BOXES.values} entries={stats.values} />
      <ListBox box={LIST_BOXES.focuses} entries={stats.focuses} />
      <ListBox box={LIST_BOXES.pastimes} entries={stats.pastimes} />
      <ListBox box={LIST_BOXES.attacks} entries={stats.attacks} />
      <ListBox box={LIST_BOXES.speciesAbilities} entries={stats.speciesAbilities} />
      <ListBox box={LIST_BOXES.talents} entries={stats.talents} />
      <ListBox box={LIST_BOXES.specialRules} entries={stats.specialRules} />
      <ListBox box={LIST_BOXES.equipment} entries={stats.equipment} />
    </Page>
  );
}

// Spickzettel im Look des Bogens: blaues Banner, blaue Namen, Regeltext in
// Grau. Läuft der Text über die Seite, bricht @react-pdf automatisch um.
function CheatSheetPage({ input }: { input: CharacterSheetPdfInput }) {
  const byName = new Map(
    input.talents.map((talent) => [talent.name.toLowerCase(), talent]),
  );

  return (
    <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.cheatPage}>
      <View style={styles.cheatMast}>
        <Text style={styles.cheatWordmark}>STAR TREK ADVENTURES</Text>
        <Text style={styles.cheatTab}>TALENTS</Text>
      </View>
      <View style={styles.cheatBannerRule} />
      <Text style={styles.cheatSubline}>
        {input.name}
        {input.rank ? ` · ${input.rank}` : ""} — Spickzettel
      </Text>
      <Text style={styles.cheatFooter} fixed>
        {SHEET_FOOTER}
      </Text>

      {input.stats.talents.map((entry, index) => {
        const { name, original } = parseTalentEntry(entry);
        const talent = byName.get(original.toLowerCase());
        return (
          <View key={`${entry}-${index}`} style={styles.cheatItem} wrap={false}>
            <Text style={styles.cheatName}>{name.toUpperCase()}</Text>
            {talent && (
              <Text style={styles.cheatMeta}>
                {talentCategoryLabel(talent.category)}
                {talent.requirement ? ` · ${talent.requirement}` : ""}
              </Text>
            )}
            <Text style={styles.cheatText}>
              {talent
                ? talent.description
                : "Nicht im Katalog — kein Regeltext hinterlegt."}
            </Text>
          </View>
        );
      })}
    </Page>
  );
}

// Drittes Blatt: die Biografie im Look der beiden anderen. Fehlt sie, fällt
// das Blatt weg — ein leeres Blatt im Ausdruck wäre nur Papierverschwendung.
function BiographyPage({ input }: { input: CharacterSheetPdfInput }) {
  const blocks = toPdfBlocks(input.bioMarkdown ?? "");
  if (blocks.length === 0) return null;

  return (
    <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.cheatPage}>
      <View style={styles.cheatMast}>
        <Text style={styles.cheatWordmark}>STAR TREK ADVENTURES</Text>
        <Text style={styles.cheatTab}>BIOGRAPHY</Text>
      </View>
      <View style={styles.cheatBannerRule} />
      <Text style={styles.cheatSubline}>
        {input.name}
        {input.rank ? ` · ${input.rank}` : ""} — Biografie
      </Text>
      <Text style={styles.cheatFooter} fixed>
        {SHEET_FOOTER}
      </Text>

      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <Text key={index} style={styles.bioHeading}>
              {block.text.toUpperCase()}
            </Text>
          );
        }
        if (block.kind === "listItem") {
          return (
            <Text key={index} style={styles.bioListItem}>
              • {block.text}
            </Text>
          );
        }
        if (block.kind === "quote") {
          return (
            <Text key={index} style={styles.bioQuote}>
              {block.text}
            </Text>
          );
        }
        return (
          <Text key={index} style={styles.bioParagraph}>
            {block.text}
          </Text>
        );
      })}
    </Page>
  );
}

export async function renderCharacterSheetPdf(
  input: CharacterSheetPdfInput,
): Promise<Buffer> {
  const document = (
    <Document
      title={`Charakterbogen ${input.name}`}
      author="Neo-Archiv"
      creator="Neo-Archiv"
    >
      <SheetPage input={input} />
      {input.stats.talents.length > 0 && <CheatSheetPage input={input} />}
      <BiographyPage input={input} />
    </Document>
  );

  try {
    return await renderToBuffer(document);
  } catch (err) {
    // Häufigste Ursache: das Portrait liegt hinter einer Adresse, die der
    // Server nicht laden kann. Lieber ein Bogen ohne Bild als gar keiner.
    if (!input.portrait) throw err;
    return renderToBuffer(
      <Document title={`Charakterbogen ${input.name}`}>
        <SheetPage input={{ ...input, portrait: null }} />
        {input.stats.talents.length > 0 && <CheatSheetPage input={input} />}
        <BiographyPage input={input} />
      </Document>,
    );
  }
}

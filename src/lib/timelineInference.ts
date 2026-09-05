import "server-only";
import sql from "@/lib/db";
import { completeText, retrieveChunks, buildContextText } from "@/lib/rag";
import type { Viewer } from "@/lib/visibility";
import {
  EVENT_CATEGORIES,
  isIsoDate,
  type TimelineSourceType,
} from "@/lib/timelineTypes";
import { cacheTags } from "@/lib/cacheTags";
import { revalidateTag } from "next/cache";

// Ereignisse aus einem Text ableiten — die zweite Datenquelle der Chronologie
// neben den gepflegten Angaben (siehe src/lib/timeline.ts).
//
// Warum überhaupt: die Kampagne führt Datumsangaben in den Feldern eines
// Inhalts (Missionsstart, Logbuch-Datum), aber das meiste, was chronologisch
// interessant ist, steht als Fließtext im Bericht — „drei Tage später erreichte
// uns …". Das Sprachmodell liest genau solche Stellen heraus.
//
// Bewusst NICHT automatisch: eine Ableitung kostet einen Modellaufruf und kann
// danebenliegen. Die Spielleitung stößt sie je Inhalt an (/gm/chronologie),
// sieht das Ergebnis und behält oder verwirft es. Was übernommen wird, landet
// in timeline_events und ist in der Ansicht als abgeleitet gekennzeichnet.
//
// Das Retrieval (dieselbe Pipeline wie der Datenbank-Assistent) liefert dem
// Modell den Zusammenhang: ohne die Nachbarinhalte hätte es für „drei Tage
// später" keinen Anker.

// Wie viele Ereignisse ein Durchlauf höchstens liefert. Mehr als das ist bei
// einem einzelnen Bericht fast immer ein Zeichen dafür, dass das Modell jeden
// Halbsatz zum Ereignis erklärt hat.
export const MAX_INFERRED_PER_RUN = 8;

// Wie viel Text ins Modell geht. Ein Logbuch ist selten länger; ein
// ausufernder Missionstext wird hinten abgeschnitten, statt den Aufruf
// scheitern zu lassen.
const MAX_SOURCE_CHARS = 8000;

const CATEGORY_KEYS = EVENT_CATEGORIES.map((c) => c.key);

export interface InferredEventCandidate {
  date: string;
  title: string;
  detail: string | null;
  category: string;
  confidence: number | null;
}

const SYSTEM_PROMPT = `Du liest Texte einer Star-Trek-Pen-&-Paper-Kampagne und trägst daraus die Ereignisse zusammen, die in eine Chronologie gehören.

Regeln:
- Antworte AUSSCHLIESSLICH mit einem JSON-Array. Kein Fließtext, keine Erklärung, keine Code-Zäune.
- Jedes Element: {"date":"JJJJ-MM-TT","title":"kurz","detail":"ein bis zwei Sätze","category":"…","confidence":0.0-1.0}
- category ist einer von: ${CATEGORY_KEYS.join(", ")}.
- Nimm nur Ereignisse auf, deren Datum im Text steht oder sich aus den genannten Ankerdaten eindeutig ausrechnen lässt ("drei Tage später"). Lässt sich ein Datum nicht bestimmen, lass das Ereignis weg.
- Erfinde nichts. Was nicht im Text steht, kommt nicht ins Array.
- Höchstens ${MAX_INFERRED_PER_RUN} Ereignisse, die wichtigsten zuerst.
- Titel auf Deutsch, ohne Anführungszeichen, höchstens 80 Zeichen.
- Gibt der Text nichts her, antworte mit [].`;

// Der Rohtext des Modells → geprüfte Kandidaten.
//
// Als eigene Funktion, weil hier die eigentliche Arbeit liegt: ein Modell hält
// sich nicht zuverlässig an „nur JSON". Deshalb wird das Array aus der Antwort
// herausgeschnitten und jedes Feld einzeln geprüft, statt dem Ergebnis zu
// vertrauen. Ein einzelnes unbrauchbares Element verwirft nicht den ganzen
// Durchlauf — es fällt still heraus.
export function parseInferredEvents(raw: string): InferredEventCandidate[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: InferredEventCandidate[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    const date = typeof row.date === "string" ? row.date.trim() : "";
    if (!isIsoDate(date)) continue;

    const title =
      typeof row.title === "string" ? row.title.trim().slice(0, 80) : "";
    if (!title) continue;

    // Dasselbe Ereignis zweimal im selben Durchlauf ist ein Modellfehler,
    // kein Datum in der Chronologie.
    const key = `${date}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const detailRaw = typeof row.detail === "string" ? row.detail.trim() : "";
    const category =
      typeof row.category === "string" &&
      (CATEGORY_KEYS as readonly string[]).includes(row.category)
        ? row.category
        : "other";

    // confidence ist ein Hinweis, kein Maß — außerhalb von 0…1 wird der Wert
    // verworfen statt zurechtgebogen.
    const confidenceRaw = row.confidence;
    const confidence =
      typeof confidenceRaw === "number" &&
      Number.isFinite(confidenceRaw) &&
      confidenceRaw >= 0 &&
      confidenceRaw <= 1
        ? confidenceRaw
        : null;

    out.push({
      date,
      title,
      detail: detailRaw ? detailRaw.slice(0, 400) : null,
      category,
      confidence,
    });
    if (out.length >= MAX_INFERRED_PER_RUN) break;
  }
  return out;
}

// Die Ankerdaten eines Inhalts, damit das Modell relative Angaben auflösen
// kann. Exportiert, weil die Zusammenstellung für sich prüfbar ist.
export function anchorLines(anchors: Record<string, string | null>): string {
  const lines = Object.entries(anchors)
    .filter(([, value]) => value)
    .map(([label, value]) => `- ${label}: ${value}`);
  return lines.length > 0
    ? lines.join("\n")
    : "- (keine Datumsangaben am Eintrag gepflegt)";
}

export interface InferenceInput {
  sourceType: TimelineSourceType;
  sourceSlug: string;
  title: string;
  // Der Quelltext des Inhalts (Markdown).
  body: string;
  // Bekannte Datumsangaben des Inhalts, z.B. { "Missionsbeginn": "2401-03-05" }.
  anchors: Record<string, string | null>;
}

// Ein Durchlauf: Zusammenhang holen, Modell fragen, Antwort prüfen. Speichert
// nichts — das entscheidet die Spielleitung (saveInferredEvents).
export async function inferEvents(
  input: InferenceInput,
  viewer: Viewer | null,
): Promise<InferredEventCandidate[]> {
  const body = input.body.slice(0, MAX_SOURCE_CHARS);
  if (body.trim() === "") return [];

  // Zusammenhang aus dem Archiv — dieselbe Retrieval-Pipeline wie der
  // Datenbank-Assistent, mit demselben Sichtbarkeitsfilter. Schlägt sie fehl
  // (kein Embedding-Schlüssel, Netzfehler), läuft die Ableitung ohne
  // Zusammenhang weiter, statt ganz auszufallen.
  let context = "";
  try {
    const chunks = await retrieveChunks(input.title, viewer, 5);
    context = buildContextText(chunks.filter((c) => c.title !== input.title));
  } catch {
    context = "(kein Zusammenhang abrufbar)";
  }

  const raw = await completeText([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Eintrag: ${input.title}\n\n` +
        `Bekannte Datumsangaben:\n${anchorLines(input.anchors)}\n\n` +
        `Text des Eintrags:\n${body}\n\n` +
        `Weiterer Zusammenhang aus dem Archiv:\n${context}`,
    },
  ]);

  return parseInferredEvents(raw);
}

// ---------------------------------------------------------------------------
// Speichern und Lesen
// ---------------------------------------------------------------------------

export interface StoredInferredEvent {
  id: number;
  date: string;
  title: string;
  detail: string | null;
  category: string;
  confidence: number | null;
  sourceType: TimelineSourceType;
  sourceSlug: string;
  createdAt: string;
}

// Übernimmt Kandidaten für einen Inhalt. Ein bereits vorhandenes Ereignis
// (gleiche Quelle, gleiches Datum, gleicher Titel) wird aktualisiert statt
// verdoppelt — die Spielleitung darf die Ableitung wiederholen, ohne die
// Chronologie zuzumüllen.
export async function saveInferredEvents(
  sourceType: TimelineSourceType,
  sourceSlug: string,
  events: InferredEventCandidate[],
  createdBy: number,
): Promise<number> {
  if (events.length === 0) return 0;
  for (const event of events) {
    await sql`
      INSERT INTO timeline_events
        (event_date, title, category, source_type, source_slug, href,
         origin, detail, confidence, created_by)
      VALUES
        (${event.date}::date, ${event.title}, ${event.category},
         ${sourceType}, ${sourceSlug}, '', 'inferred',
         ${event.detail}, ${event.confidence}, ${createdBy})
      ON CONFLICT (source_type, source_slug, event_date, title)
      DO UPDATE SET category   = EXCLUDED.category,
                    detail     = EXCLUDED.detail,
                    confidence = EXCLUDED.confidence
    `;
  }
  revalidateTag(cacheTags.timeline, { expire: 0 });
  return events.length;
}

export async function listInferredEvents(): Promise<StoredInferredEvent[]> {
  const rows = await sql<
    {
      id: number;
      event_date: string;
      title: string;
      detail: string | null;
      category: string;
      confidence: number | null;
      source_type: TimelineSourceType;
      source_slug: string;
      created_at: string;
    }[]
  >`
    SELECT id, event_date::text AS event_date, title, detail, category,
           confidence, source_type, source_slug, created_at::text AS created_at
    FROM timeline_events
    ORDER BY event_date DESC, id DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    date: row.event_date,
    title: row.title,
    detail: row.detail,
    category: row.category,
    confidence: row.confidence,
    sourceType: row.source_type,
    sourceSlug: row.source_slug,
    createdAt: row.created_at,
  }));
}

export async function deleteInferredEvent(id: number): Promise<void> {
  await sql`DELETE FROM timeline_events WHERE id = ${id}`;
  revalidateTag(cacheTags.timeline, { expire: 0 });
}

export async function countInferredBySource(): Promise<Map<string, number>> {
  const rows = await sql<
    { source_type: string; source_slug: string; count: number }[]
  >`
    SELECT source_type, source_slug, COUNT(*)::int AS count
    FROM timeline_events
    GROUP BY source_type, source_slug
  `;
  return new Map(rows.map((r) => [`${r.source_type}:${r.source_slug}`, r.count]));
}

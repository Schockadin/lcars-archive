// Embedding-Pipeline des RAG-Systems (siehe Plan „RAG-System auf Basis der
// LCARS-Archive-Datenbank"). Dieses Modul ist bewusst OHNE „server-only"
// gehalten (wie mailCore.ts / dialoguesCore.ts): es wird sowohl von der App
// (Server Actions → src/lib/embeddingSync.ts) als auch vom Backfill-Skript
// (scripts/embed-all.ts, per tsx außerhalb von Next) genutzt.
//
// Verantwortlichkeiten:
//   - chunkContent(): typabhängiges Zerlegen eines Inhalts in Chunks
//     (reine, DB-/netzfreie Logik → unit-testbar).
//   - generateEmbedding()/embedTexts(): OpenAI-Embedding (text-embedding-3-
//     small, auf 512 Dimensionen reduziert) per REST — analog zum Raw-HTTP-
//     Stil von mailCore.ts (kein SDK-Zwang), hier über das schlanke openai-
//     Paket, das genau diesen Call kapselt.
//   - upsertEmbeddings()/deleteEmbeddings()/updateEmbedding*(): Schreibpfad in
//     content_embeddings (siehe scripts/schema.sql). Alle nehmen einen
//     SqlClient-Parameter, damit App (globaler sql) und Skript (eigener
//     postgres-Client / Transaktion) denselben Code nutzen.
//
// Die Vektoren werden als String '[0.1,0.2,…]' inline nach ::vector gecastet
// (kein pgvector-npm-Paket) — passt zum Raw-SQL-Stil und funktioniert mit
// prepare:false (pgBouncer, siehe src/lib/db.ts).

import type { Sql } from "postgres";
import OpenAI from "openai";
import { stripMarkdown } from "@/lib/search";
import type { Visibility } from "@/lib/visibility";

// Ein postgres.js-Client ODER eine Transaktion (sql.begin(tx => …)). Beide
// tragen dasselbe Tagged-Template-Interface. Gleiches Muster wie der
// SqlClient-Parameter in dialoguesCore.ts.
export type SqlClient = Sql;

export type EmbeddingContentType =
  | "character"
  | "mission"
  | "mission_log"
  | "archive_entry"
  | "dialogue";

// text-embedding-3-small unterstützt die Matryoshka-Reduktion: dieselbe
// Anfrage mit dimensions:512 liefert brauchbare, deutlich kompaktere Vektoren.
// MUSS mit vector(512) in scripts/schema.sql und mit der Query-Seite
// (src/lib/rag.ts) übereinstimmen.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;

// Grobe Token-Schätzung ohne Tokenizer-Abhängigkeit: ~4 Zeichen/Token ist für
// deutschen Fließtext eine brauchbare Näherung. Wird nur zur Chunk-Größen-
// steuerung gebraucht, nicht zur Abrechnung — eine Näherung genügt.
const CHARS_PER_TOKEN = 4;

// Chunk-Ziele laut Plan (Abschnitt „Chunking-Strategie"):
//   - Mission-Logs: ~800 Tokens, ~100 Token Overlap.
//   - Archiv-Einträge: < 1000 Tokens 1 Chunk, sonst an Heading-Grenzen ~800.
const LOG_CHUNK_TOKENS = 800;
const LOG_CHUNK_OVERLAP_TOKENS = 100;
const ARCHIVE_SINGLE_CHUNK_MAX_TOKENS = 1000;
const ARCHIVE_CHUNK_TOKENS = 800;

// Ziel-Obergrenze für die eigentlich „ein Chunk"-Typen (Character/Mission/
// Dialog): ist der Inhalt größer, wird auch hier gesplittet. Vor allem für
// lange, aggregierte Dialoge nötig — OpenAIs text-embedding-3-small nimmt pro
// Eingabe MAXIMAL 8192 Tokens an, ein einzelner Riesen-Chunk lief sonst in
// „maximum input length is 8192 tokens" (HTTP 400).
const SINGLE_CHUNK_TARGET_TOKENS = 1500;

// Harte Zeichen-Obergrenze pro Chunk als letzter Notausgang — greift, falls
// ein einzelnes, nicht weiter zerlegbares Segment (z.B. eine sehr lange Zeile
// ohne Satzzeichen) trotz Token-Splitting zu groß bleibt. Bewusst konservativ:
// 8000 Zeichen liegen selbst bei dichter (deutscher) Tokenisierung deutlich
// unter dem 8192-Token-Limit. Der Header (wenige Zeilen) kommt oben drauf,
// deshalb liegen die Ziel-Grenzen oben klar darunter.
const HARD_MAX_CHARS = 8000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// Letzter Notausgang gegen das 8192-Token-Limit: zerschneidet jeden Chunk, der
// HARD_MAX_CHARS überschreitet, hart an Zeichengrenzen. Kommt bei normalem
// Inhalt nie zum Tragen (die Token-Ziele liegen weit darunter), schützt aber
// vor pathologischen Einzel-Segmenten ohne Satz-/Absatzgrenzen.
function hardCapChars(texts: string[]): string[] {
  const out: string[] = [];
  for (const text of texts) {
    if (text.length <= HARD_MAX_CHARS) {
      out.push(text);
      continue;
    }
    for (let i = 0; i < text.length; i += HARD_MAX_CHARS) {
      out.push(text.slice(i, i + HARD_MAX_CHARS));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

export interface Chunk {
  index: number;
  text: string;
}

// Baut einen kompakten Metadaten-Header, der jedem Chunk vorangestellt wird —
// gibt dem Embedding (und später dem LLM-Kontext) Aufhänger, die im reinen
// Fließtext fehlen (z.B. „welche Mission", „welcher Autor"). Leere Felder
// werden ausgelassen.
function buildHeader(lines: Array<[string, string | null | undefined]>): string {
  const parts = lines
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${String(value).trim()}`);
  return parts.join("\n");
}

// Setzt Header + Fließtext zu einem Chunk-Text zusammen.
function withHeader(header: string, body: string): string {
  const cleanBody = body.trim();
  if (!header) return cleanBody;
  return `${header}\n\n${cleanBody}`;
}

// Zerlegt langen Fließtext (bereits von Markdown befreit) in Chunks mit einem
// Ziel von targetTokens und overlapTokens Überlappung. Schneidet an Absatz-
// Grenzen (\n\n) und — falls ein einzelner Absatz das Ziel sprengt — an
// Satzgrenzen. Der Overlap wird als die letzten ~overlapTokens des vorigen
// Chunks dem nächsten vorangestellt (Kontext-Kontinuität für lange Logs).
export function splitByTokens(
  text: string,
  targetTokens: number,
  overlapTokens: number,
): string[] {
  const flat = text.trim();
  if (!flat) return [];
  if (estimateTokens(flat) <= targetTokens) return [flat];

  // Segmente: erst Absätze, dann überlange Absätze in Sätze zerlegen.
  const segments: string[] = [];
  for (const para of flat.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    if (estimateTokens(p) <= targetTokens) {
      segments.push(p);
    } else {
      // Absatz zu groß → an Satzenden (. ! ? …) aufteilen.
      const sentences = p.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) ?? [p];
      let buffer = "";
      for (const s of sentences) {
        const candidate = buffer ? `${buffer} ${s.trim()}` : s.trim();
        if (estimateTokens(candidate) > targetTokens && buffer) {
          segments.push(buffer);
          buffer = s.trim();
        } else {
          buffer = candidate;
        }
      }
      if (buffer) segments.push(buffer);
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const seg of segments) {
    const candidate = current ? `${current}\n\n${seg}` : seg;
    if (estimateTokens(candidate) > targetTokens && current) {
      chunks.push(current);
      // Overlap: die letzten overlapTokens Zeichen des vorigen Chunks dem
      // nächsten voranstellen, an einer Wortgrenze abgeschnitten.
      const overlapChars = overlapTokens * CHARS_PER_TOKEN;
      const tail = current.slice(-overlapChars);
      const wordSafeTail = tail.slice(tail.indexOf(" ") + 1).trim();
      current = wordSafeTail ? `${wordSafeTail}\n\n${seg}` : seg;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Zerlegt einen (rohen) Markdown-Text an ATX-Heading-Grenzen (# … ######) in
// Abschnitte. Text vor der ersten Überschrift bildet einen eigenen Abschnitt.
// Für die Archiv-Chunk-Strategie (Split an Heading-Grenzen bei langen
// Einträgen).
export function splitMarkdownByHeadings(md: string): string[] {
  const lines = md.split("\n");
  const sections: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const joined = buffer.join("\n").trim();
    if (joined) sections.push(joined);
    buffer = [];
  };
  for (const line of lines) {
    if (/^\s{0,3}#{1,6}\s+/.test(line) && buffer.length > 0) {
      flush();
    }
    buffer.push(line);
  }
  flush();
  return sections;
}

// --- Typabhängige Eingaben (bereits aus der DB aufgelöst) -------------------

export interface CharacterChunkInput {
  name: string;
  species?: string | null;
  rank?: string | null;
  status?: string | null;
  sourceMd?: string | null;
  // Fallback-Fließtext (stripHtml(content)/bio), falls kein source_md vorliegt.
  fallbackText?: string | null;
}

export interface MissionChunkInput {
  title: string;
  status?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  sourceMd?: string | null;
  fallbackText?: string | null;
}

export interface MissionLogChunkInput {
  title: string;
  missionTitle?: string | null;
  authorName?: string | null;
  sessionNr?: number | null;
  logDate?: string | null;
  sourceMd?: string | null;
  fallbackText?: string | null;
}

export interface ArchiveChunkInput {
  title: string;
  category?: string | null;
  setting?: string | null;
  sourceMd?: string | null;
  fallbackText?: string | null;
}

export interface DialogueChunkInput {
  title?: string | null;
  setting?: string | null;
  participants?: string[];
  sourceMd?: string | null;
  fallbackText?: string | null;
}

export type ChunkInput =
  | { type: "character"; record: CharacterChunkInput }
  | { type: "mission"; record: MissionChunkInput }
  | { type: "mission_log"; record: MissionLogChunkInput }
  | { type: "archive_entry"; record: ArchiveChunkInput }
  | { type: "dialogue"; record: DialogueChunkInput };

// Quelle ist immer das rohe Markdown (source_md); fehlt es (Alt-Datensätze),
// dient der bereits als Fließtext übergebene Fallback. stripMarkdown() ist
// dieselbe Funktion wie in der Suche (src/lib/search.ts).
function narrativeMd(record: {
  sourceMd?: string | null;
  fallbackText?: string | null;
}): string {
  if (record.sourceMd && record.sourceMd.trim()) return record.sourceMd;
  return record.fallbackText?.trim() ?? "";
}

// Baut die Chunks für einen Inhalt. REIN (keine DB, kein Netz) — Kern der
// Unit-Tests. Gibt eine (evtl. leere) Liste indizierter Chunks zurück; ein
// Inhalt ohne verwertbaren Text liefert [].
export function chunkContent(input: ChunkInput): Chunk[] {
  const texts = hardCapChars(buildChunkTexts(input));
  return texts
    .map((text, index) => ({ index, text: text.trim() }))
    .filter((c) => c.text !== "");
}

// Zerlegt den (bereits von Markdown befreiten) Fließtext eines „ein Chunk"-Typs
// (Character/Mission/Dialog) in einen ODER — bei großem Inhalt — mehrere
// Chunks, jeweils mit vorangestelltem Header. Kurzer Inhalt bleibt ein
// einziger Chunk (splitByTokens gibt dann [text] zurück).
function headeredBodyChunks(
  header: string,
  body: string,
  fallback: string,
): string[] {
  if (!body) return [withHeader(header, fallback)];
  return splitByTokens(
    body,
    SINGLE_CHUNK_TARGET_TOKENS,
    LOG_CHUNK_OVERLAP_TOKENS,
  ).map((c) => withHeader(header, c));
}

function buildChunkTexts(input: ChunkInput): string[] {
  switch (input.type) {
    case "character": {
      const r = input.record;
      const header = buildHeader([
        ["Charakter", r.name],
        ["Spezies", r.species],
        ["Rang", r.rank],
        ["Status", r.status],
      ]);
      const body = stripMarkdown(narrativeMd(r));
      // 1 Chunk pro Charakter (Plan) — bei ungewöhnlich langer Bio zur
      // Sicherheit gesplittet. Auch ohne Bio bleibt der Header als minimaler,
      // durchsuchbarer Steckbrief erhalten.
      return headeredBodyChunks(header, body, r.name);
    }
    case "mission": {
      const r = input.record;
      const header = buildHeader([
        ["Mission", r.title],
        ["Status", r.status],
        ["Beginn", r.startedAt],
        ["Ende", r.endedAt],
      ]);
      const body = stripMarkdown(narrativeMd(r));
      // 1 Chunk pro Mission (Plan) — bei ungewöhnlich langer Synopsis gesplittet.
      return headeredBodyChunks(header, body, r.title);
    }
    case "mission_log": {
      const r = input.record;
      const header = buildHeader([
        ["Einsatzbericht", r.title],
        ["Mission", r.missionTitle],
        ["Autor", r.authorName],
        ["Session", r.sessionNr != null ? String(r.sessionNr) : null],
        ["Datum", r.logDate],
      ]);
      const body = stripMarkdown(narrativeMd(r));
      if (!body) return [withHeader(header, r.title)];
      // ~800 Token-Chunks mit ~100 Token Overlap; Header jedem Chunk voran.
      return splitByTokens(
        body,
        LOG_CHUNK_TOKENS,
        LOG_CHUNK_OVERLAP_TOKENS,
      ).map((c) => withHeader(header, c));
    }
    case "archive_entry": {
      const r = input.record;
      const header = buildHeader([
        ["Archiv-Eintrag", r.title],
        ["Kategorie", r.category],
        ["Schauplatz", r.setting],
      ]);
      const md = narrativeMd(r);
      const body = stripMarkdown(md);
      if (!body) return [withHeader(header, r.title)];
      // < 1000 Token → 1 Chunk; länger → an Heading-Grenzen, Ziel ~800.
      if (estimateTokens(body) <= ARCHIVE_SINGLE_CHUNK_MAX_TOKENS) {
        return [withHeader(header, body)];
      }
      const sections = splitMarkdownByHeadings(md);
      const chunks: string[] = [];
      for (const section of sections) {
        const plain = stripMarkdown(section);
        if (!plain) continue;
        if (estimateTokens(plain) <= ARCHIVE_CHUNK_TOKENS) {
          chunks.push(plain);
        } else {
          // Ein einzelner Abschnitt sprengt das Ziel → nach Tokens
          // weiterteilen (ohne Overlap: Heading-Abschnitte sind bereits
          // thematisch getrennt).
          chunks.push(...splitByTokens(plain, ARCHIVE_CHUNK_TOKENS, 0));
        }
      }
      const result = chunks.length > 0 ? chunks : [body];
      return result.map((c) => withHeader(header, c));
    }
    case "dialogue": {
      const r = input.record;
      const header = buildHeader([
        ["Gespräch", r.title],
        ["Schauplatz", r.setting],
        [
          "Teilnehmer",
          r.participants && r.participants.length > 0
            ? r.participants.join(", ")
            : null,
        ],
      ]);
      const body = stripMarkdown(narrativeMd(r));
      // Alle Messages sind (als abgeschlossener Dialog) bereits zu einem
      // Fließtext aggregiert (archive_entries.source_md). Meist 1 Chunk, bei
      // langen Gesprächen aber gesplittet — sonst überschreitet der aggregierte
      // Text schnell das 8192-Token-Limit von OpenAI (der Fehler aus der Praxis).
      return headeredBodyChunks(header, body, r.title || "Gespräch");
    }
  }
}

// ---------------------------------------------------------------------------
// OpenAI-Embedding
// ---------------------------------------------------------------------------

let openaiClient: OpenAI | null = null;

// Lazy-Instanz — wirft nur, wenn tatsächlich embedded wird und der Key fehlt
// (der Aufrufer im App-Trigger prüft hasEmbeddingConfig() vorher und
// überspringt still, wie mail/push ohne Key).
function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Ob die Embedding-Erzeugung konfiguriert ist. Fire-and-forget-Trigger und
// die RAG-Route überspringen still, solange kein Key gesetzt ist.
export function hasEmbeddingConfig(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// Einzel-Embedding (z.B. die User-Frage in der Retrieval-Pipeline).
export async function generateEmbedding(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

// Batch-Embedding mehrerer Texte in einem Request (günstiger für den
// Backfill). Reihenfolge der Ausgabe entspricht der Eingabe.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    input: texts,
  });
  // API garantiert die Eingabereihenfolge nicht per se — nach index sortieren.
  return res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);
}

// pgvector erwartet das Literal '[0.1,0.2,…]', das inline nach ::vector
// gecastet wird (siehe Modul-Kopf).
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// ---------------------------------------------------------------------------
// Schreibpfad content_embeddings
// ---------------------------------------------------------------------------

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

export interface UpsertEmbeddingsParams {
  contentType: EmbeddingContentType;
  contentId: number;
  chunks: EmbeddedChunk[];
  // Denormalisierte RBAC-Felder (siehe scripts/schema.sql / canView).
  visibility: Visibility;
  ownerId: number | null;
  isDraft: boolean;
  isActive: boolean;
  // Für die Quellen-Angaben unter der RAG-Antwort.
  title: string | null;
  slug: string | null;
  href: string | null;
  metadata?: Record<string, unknown>;
}

// Schreibt alle Chunks eines Inhalts. Idempotent über den UNIQUE-Constraint
// (content_type, content_id, chunk_index): bestehende Chunks werden
// aktualisiert, überzählige (bei kürzer gewordenem Inhalt) entfernt. Der
// Aufrufer kann einen Transaktions-Client übergeben.
export async function upsertEmbeddings(
  client: SqlClient,
  params: UpsertEmbeddingsParams,
): Promise<void> {
  const {
    contentType,
    contentId,
    chunks,
    visibility,
    ownerId,
    isDraft,
    isActive,
    title,
    slug,
    href,
    metadata = {},
  } = params;

  // Ohne Chunks (Inhalt ohne Text) alle bestehenden Zeilen entfernen.
  if (chunks.length === 0) {
    await deleteEmbeddings(client, contentType, contentId);
    return;
  }

  // Überzählige Chunk-Indizes eines vorher längeren Inhalts entfernen.
  await client`
    DELETE FROM content_embeddings
    WHERE content_type = ${contentType} AND content_id = ${contentId}
      AND chunk_index >= ${chunks.length}
  `;

  for (const chunk of chunks) {
    await client`
      INSERT INTO content_embeddings (
        content_type, content_id, chunk_index, chunk_text, embedding,
        visibility, owner_id, is_draft, is_active, title, slug, href,
        metadata, updated_at
      ) VALUES (
        ${contentType}, ${contentId}, ${chunk.index}, ${chunk.text},
        ${toVectorLiteral(chunk.embedding)}::vector,
        ${visibility}, ${ownerId}, ${isDraft}, ${isActive},
        ${title}, ${slug}, ${href},
        ${client.json(metadata as ReturnType<typeof JSON.parse>)}, NOW()
      )
      ON CONFLICT (content_type, content_id, chunk_index) DO UPDATE SET
        chunk_text = EXCLUDED.chunk_text,
        embedding  = EXCLUDED.embedding,
        visibility = EXCLUDED.visibility,
        owner_id   = EXCLUDED.owner_id,
        is_draft   = EXCLUDED.is_draft,
        is_active  = EXCLUDED.is_active,
        title      = EXCLUDED.title,
        slug       = EXCLUDED.slug,
        href       = EXCLUDED.href,
        metadata   = EXCLUDED.metadata,
        updated_at = NOW()
    `;
  }
}

// Entfernt alle Chunks eines Inhalts (endgültige Löschung / Purge).
export async function deleteEmbeddings(
  client: SqlClient,
  contentType: EmbeddingContentType,
  contentId: number,
): Promise<void> {
  await client`
    DELETE FROM content_embeddings
    WHERE content_type = ${contentType} AND content_id = ${contentId}
  `;
}

// Sichtbarkeits-Änderung: nur das denormalisierte Feld nachziehen (kein
// Re-Embedding nötig — der Text ändert sich nicht).
export async function updateEmbeddingVisibility(
  client: SqlClient,
  contentType: EmbeddingContentType,
  contentId: number,
  visibility: Visibility,
): Promise<void> {
  await client`
    UPDATE content_embeddings SET visibility = ${visibility}, updated_at = NOW()
    WHERE content_type = ${contentType} AND content_id = ${contentId}
  `;
}

// Soft-Delete/Restore: is_active nachziehen (Suche schließt is_active=false
// aus), ohne die Zeile zu löschen.
export async function updateEmbeddingActive(
  client: SqlClient,
  contentType: EmbeddingContentType,
  contentId: number,
  isActive: boolean,
): Promise<void> {
  await client`
    UPDATE content_embeddings SET is_active = ${isActive}, updated_at = NOW()
    WHERE content_type = ${contentType} AND content_id = ${contentId}
  `;
}

// Owner-Wechsel: nur owner_id nachziehen (betrifft den Owner-Bypass im
// RBAC-Filter, siehe canView) — kein Re-Embedding nötig, der Text ändert sich
// nicht.
export async function updateEmbeddingOwner(
  client: SqlClient,
  contentType: EmbeddingContentType,
  contentId: number,
  ownerId: number | null,
): Promise<void> {
  await client`
    UPDATE content_embeddings SET owner_id = ${ownerId}, updated_at = NOW()
    WHERE content_type = ${contentType} AND content_id = ${contentId}
  `;
}

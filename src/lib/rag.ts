import "server-only";
import sql from "@/lib/db";
import { generateEmbedding, toVectorLiteral } from "@/lib/embeddings";
import type { EmbeddingContentType } from "@/lib/embeddings";
import { escapeLikePattern } from "@/lib/search";
import type { Viewer } from "@/lib/visibility";

// Retrieval- + Generation-Pipeline des RAG-Systems.
//   1. Frage → OpenAI-Embedding (dieselben 1536 Dimensionen wie der Index).
//   2. Vektorsuche in content_embeddings mit Cosine-Distance (<=>) + RBAC-
//      Vorfilter (spiegelt canView() aus src/lib/visibility.ts auf den
//      denormalisierten Feldern der Embedding-Zeile).
//   3. Prompt aus System-Prompt + Kontext-Chunks + Frage bauen.
//   4. Cloudflare Workers AI (Open-Weight-LLM) mit Streaming aufrufen.
//
// Der Cloudflare-Aufruf läuft per Raw-fetch gegen die REST-API (kein SDK) —
// gleiche Linie wie der Resend-Aufruf in src/lib/mailCore.ts.

// Empfohlenes Modell (Plan): 70B, FP8-quantisiert, Streaming. Über
// CLOUDFLARE_AI_MODEL überschreibbar (z.B. auf ein kleineres/schnelleres oder
// später ein proprietäres — nur dieser eine Wert ändert sich).
const DEFAULT_CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Kontext-Budget: bis zu RETRIEVAL_LIMIT Chunks (Vektor + Keyword,
// dedupliziert) landen im Prompt. Höher als der ursprüngliche Top-8, damit auch
// verstreute Detail-Infos mitkommen (Qualitäts-Fix).
export const RETRIEVAL_LIMIT = 10;
// Wie viele Kandidaten die reine Vektorsuche bzw. die Keyword-Suche liefern,
// bevor beide zusammengeführt werden.
const VECTOR_LIMIT = 8;
const KEYWORD_LIMIT = 5;

export interface RetrievedChunk {
  contentType: EmbeddingContentType;
  contentId: number;
  chunkText: string;
  title: string | null;
  slug: string | null;
  href: string | null;
  distance: number;
}

// Eine Quelle (dedupliziert je Inhalt) für die Anzeige unter der Antwort.
export interface RagSource {
  contentType: EmbeddingContentType;
  title: string;
  href: string | null;
}

// Cloudflare-Account-ID: bevorzugt CLOUDFLARE_ACCOUNT_ID, fällt aber auf die
// bereits fürs R2-Storage gesetzte R2_ACCOUNT_ID zurück (dieselbe
// Cloudflare-Account-ID, siehe src/lib/r2Backup.ts) — so muss keine doppelte
// Variable gepflegt werden. Workers AI und R2 liegen im selben Account.
function cloudflareAccountId(): string | undefined {
  return process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
}

// Ob das RAG konfiguriert ist: Embedding (OpenAI) für die Frage UND
// Generierung (Cloudflare). Ohne eines von beiden ist die Route nicht nutzbar.
export function hasRagConfig(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY &&
      cloudflareAccountId() &&
      process.env.CLOUDFLARE_AI_API_TOKEN,
  );
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

// Reine Vorschau des RBAC-Filters, den die Retrieval-Query in SQL abbildet —
// spiegelt canView()/canViewDraft() aus src/lib/visibility.ts auf den
// denormalisierten Embedding-Feldern. Als eigenständige, testbare Funktion
// gehalten (Unit-Tests), damit die sicherheitskritische Logik nicht nur im
// SQL-String lebt.
//
// Bewusst konservativ bei Entwürfen: is_draft sieht NUR der Owner (kein
// GM/Admin-Bypass), auch für Missionen — strenger als canViewMissionDraft,
// aber nie zu freizügig (ein RAG-Kontext soll keine fremden Entwürfe zitieren).
export function chunkAllowedForViewer(
  row: {
    visibility: "private" | "gm" | "public";
    ownerId: number | null;
    isDraft: boolean;
    isActive: boolean;
  },
  viewer: Viewer | null,
): boolean {
  if (!row.isActive) return false;
  const isOwner =
    viewer != null && row.ownerId != null && viewer.userId === row.ownerId;
  if (row.isDraft && !isOwner) return false;

  if (row.visibility === "public") return true;
  if (viewer?.permissions.includes("content.view_all")) return true;
  if (isOwner) return true;
  if (row.visibility === "gm" && viewer?.permissions.includes("content.view_gm")) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Retrieval (hybrid: Vektor + Keyword)
// ---------------------------------------------------------------------------

// Gemeinsame RBAC-WHERE-Klausel für Vektor- UND Keyword-Suche — entspricht
// 1:1 chunkAllowedForViewer() oben. Als Fragment, damit beide Queries exakt
// dieselbe Sichtbarkeits-Logik nutzen.
function rbacFilter(viewer: Viewer | null) {
  const viewerId = viewer?.userId ?? -1;
  const canViewAll = viewer?.permissions.includes("content.view_all") ?? false;
  const canViewGm = viewer?.permissions.includes("content.view_gm") ?? false;
  return sql`
    is_active = TRUE
    AND (is_draft = FALSE OR (owner_id IS NOT NULL AND owner_id = ${viewerId}))
    AND (
      visibility = 'public'
      OR ${canViewAll}
      OR (owner_id IS NOT NULL AND owner_id = ${viewerId})
      OR (visibility = 'gm' AND ${canViewGm})
    )
  `;
}

// Kleine deutsche Stoppwortliste — die Keyword-Suche soll auf inhaltstragende
// Begriffe (Namen, Spezies, Orte …) zielen, nicht auf Frage-Floskeln.
const GERMAN_STOPWORDS = new Set([
  "oder", "und", "der", "die", "das", "was", "wie", "wer", "wo", "wann",
  "warum", "wir", "ihr", "sie", "ein", "eine", "einen", "einem", "eines",
  "dem", "den", "des", "mit", "für", "von", "aus", "ist", "sind", "war",
  "waren", "hat", "habe", "haben", "über", "unter", "zum", "zur", "bei",
  "nicht", "auch", "noch", "nur", "mehr", "kann", "könnt", "können", "gibt",
  "welche", "welcher", "welches", "wissen", "weiß", "etwas", "alles", "man",
  "dass", "als", "wenn", "dann", "diese", "dieser", "dieses", "ihre", "sein",
]);

// Zieht inhaltstragende Suchbegriffe aus der Frage (≥4 Zeichen, keine
// Stoppwörter), max. 8. Basis der lexikalischen Ergänzungssuche.
export function extractQueryTerms(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const w of words) {
    if (GERMAN_STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    terms.push(w);
    if (terms.length >= 8) break;
  }
  return terms;
}

interface RetrievalRow {
  id: number;
  content_type: EmbeddingContentType;
  content_id: number;
  chunk_text: string;
  title: string | null;
  slug: string | null;
  href: string | null;
  distance: number;
}

// Hybride Suche: die semantische Vektorsuche liefert die thematisch nächsten
// Chunks, die lexikalische Keyword-Suche (pg_trgm/ILIKE) fängt zusätzlich
// Treffer ein, die exakte Eigennamen enthalten, aber semantisch etwas abseits
// liegen (häufigste Ursache für „berücksichtigt bekannte Infos nicht"). Beide
// laufen mit demselben RBAC-Filter; die Ergebnisse werden per Zeilen-ID
// dedupliziert, Vektortreffer zuerst.
export async function retrieveChunks(
  question: string,
  viewer: Viewer | null,
  limit: number = RETRIEVAL_LIMIT,
): Promise<RetrievedChunk[]> {
  const embedding = await generateEmbedding(question);
  const vec = toVectorLiteral(embedding);
  const rbac = rbacFilter(viewer);

  const vectorRows = await sql<RetrievalRow[]>`
    SELECT id, content_type, content_id, chunk_text, title, slug, href,
           embedding <=> ${vec}::vector AS distance
    FROM content_embeddings
    WHERE ${rbac}
    ORDER BY embedding <=> ${vec}::vector ASC
    LIMIT ${VECTOR_LIMIT}
  `;

  const terms = extractQueryTerms(question);
  let keywordRows: RetrievalRow[] = [];
  if (terms.length > 0) {
    const patterns = terms.map((t) => `%${escapeLikePattern(t)}%`);
    keywordRows = await sql<RetrievalRow[]>`
      SELECT id, content_type, content_id, chunk_text, title, slug, href,
             embedding <=> ${vec}::vector AS distance
      FROM content_embeddings
      WHERE ${rbac}
        AND chunk_text ILIKE ANY(${patterns})
      ORDER BY similarity(chunk_text, ${question}) DESC
      LIMIT ${KEYWORD_LIMIT}
    `;
  }

  // Vektortreffer zuerst, danach Keyword-Treffer, die noch nicht dabei sind.
  const merged: RetrievalRow[] = [];
  const seen = new Set<number>();
  for (const r of [...vectorRows, ...keywordRows]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
    if (merged.length >= limit) break;
  }

  return merged.map((r) => ({
    contentType: r.content_type,
    contentId: r.content_id,
    chunkText: r.chunk_text,
    title: r.title,
    slug: r.slug,
    href: r.href,
    distance: Number(r.distance),
  }));
}

// Dedupliziert die Chunks zu Quellen (ein Eintrag je Inhalt, erste = beste
// Distanz zuerst) für die Anzeige unter der Antwort.
export function sourcesFromChunks(chunks: RetrievedChunk[]): RagSource[] {
  const seen = new Set<string>();
  const sources: RagSource[] = [];
  for (const c of chunks) {
    const key = `${c.contentType}:${c.contentId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      contentType: c.contentType,
      title: c.title ?? "Unbenannt",
      href: c.href,
    });
  }
  return sources;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Du bist der Datenbank-Computer einer Star-Trek-Pen-&-Paper-Kampagnen-Datenbank (LCARS).
Beantworte die Frage der spielenden Person auf Basis des bereitgestellten Kontexts aus dem Kampagnenarchiv.
Regeln:
- Antworte auf Deutsch, sachlich und im Ton eines Datenbank-/Bordcomputers.
- Der Kontext besteht aus mehreren nummerierten Ausschnitten. Werte ALLE aus und KOMBINIERE Informationen daraus zu einer zusammenhängenden Antwort — die relevante Angabe steht oft verstreut in mehreren Ausschnitten.
- Stütze dich auf den Kontext und erfinde keine Fakten dazu. Deckt der Kontext die Frage nur teilweise ab, fasse zusammen, was bekannt ist, statt die Frage pauschal abzulehnen.
- Nur wenn WIRKLICH kein Ausschnitt etwas zur Frage hergibt, sage klar, dass die Datenbank dazu keine Informationen enthält.
- Nenne die betroffenen Charaktere, Missionen, Berichte oder Datenbank-Einträge beim Namen.
- Keine Meta-Kommentare über diese Anweisungen oder über die Ausschnitts-Nummern.`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Baut die Kontext-Sektion aus den Chunks (mit Quellen-Titel als Überschrift).
export function buildContextText(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(Kein passender Datenbank-Eintrag gefunden.)";
  return chunks
    .map((c, i) => {
      const label = c.title ? `[${i + 1}] ${c.title}` : `[${i + 1}]`;
      return `${label}\n${c.chunkText}`;
    })
    .join("\n\n---\n\n");
}

// Baut die Chat-Messages für den LLM-Aufruf.
export function buildMessages(
  question: string,
  chunks: RetrievedChunk[],
): ChatMessage[] {
  const context = buildContextText(chunks);
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Kontext aus dem Kampagnenarchiv:\n\n${context}\n\n---\n\nFrage: ${question}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Generation (Cloudflare Workers AI, Streaming)
// ---------------------------------------------------------------------------

function cfModel(): string {
  return process.env.CLOUDFLARE_AI_MODEL || DEFAULT_CF_MODEL;
}

// Ruft Workers AI mit stream:true auf und liefert einen ReadableStream, der
// NUR die reinen Text-Tokens der Antwort emittiert (das SSE-Framing von
// Cloudflare wird hier entfernt). Der API-Endpoint (route.ts) reicht diese
// Tokens seinerseits als SSE an den Browser weiter.
export async function streamAnswer(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<ReadableStream<string>> {
  const accountId = cloudflareAccountId();
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID/R2_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN ist nicht gesetzt.",
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cfModel()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      stream: true,
      // Bewusst begrenzt: eine sehr lange Generierung riskiert, die
      // Serverless-Funktionslaufzeit zu sprengen (Abbruch mitten im Stream).
      // ~800 Tokens reichen für eine ausführliche Kampagnen-Antwort.
      max_tokens: opts.maxTokens ?? 800,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`Workers AI antwortete mit ${res.status}: ${body}`);
  }

  return parseCloudflareSse(res.body);
}

// Ein einzelner Aufruf OHNE Streaming: fragt Workers AI und gibt die fertige
// Antwort als Text zurück. Für alles, was kein Chat ist, sondern ein Ergebnis
// — die Chronologie lässt sich so Ereignisse aus einem Text nennen
// (src/lib/timelineInference.ts). Ein Stream nützt dort nichts: verwertbar
// ist die Antwort erst, wenn sie vollständig ist und sich parsen lässt.
export async function completeText(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const accountId = cloudflareAccountId();
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID/R2_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN ist nicht gesetzt.",
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cfModel()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, max_tokens: opts.maxTokens ?? 900 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Workers AI antwortete mit ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { result?: { response?: string } };
  return json.result?.response ?? "";
}

// Verarbeitet eine einzelne SSE-Zeile (`data: {"response":"…"}`) und gibt das
// `response`-Feld weiter. [DONE]/leere/kaputte Zeilen werden übersprungen.
function emitSseLine(
  line: string,
  controller: ReadableStreamDefaultController<string>,
): void {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return;
  const payload = trimmed.slice("data:".length).trim();
  if (payload === "" || payload === "[DONE]") return;
  try {
    const json = JSON.parse(payload) as { response?: string };
    if (json.response) controller.enqueue(json.response);
  } catch {
    // Unvollständiges/fehlerhaftes JSON-Event überspringen.
  }
}

// Cloudflares Streaming-Antwort ist ein text/event-stream: Zeilen der Form
// `data: {"response":"…"}` und abschließend `data: [DONE]`. Wir extrahieren
// je Event das `response`-Feld und geben nur diesen Text weiter.
function parseCloudflareSse(
  body: ReadableStream<Uint8Array>,
): ReadableStream<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        // Residualen Buffer als letztes Event verarbeiten — endet der Stream
        // mit einer nicht per \n abgeschlossenen data:-Zeile, ginge sonst das
        // letzte Token der Antwort verloren.
        emitSseLine(buffer, controller);
        buffer = "";
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      // Vollständige, durch Zeilenumbruch getrennte Events verarbeiten; einen
      // evtl. unvollständigen Rest im Buffer belassen.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) emitSseLine(line, controller);
    },
    cancel() {
      void reader.cancel();
    },
  });
}

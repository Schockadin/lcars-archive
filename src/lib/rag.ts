import "server-only";
import sql from "@/lib/db";
import { generateEmbedding, toVectorLiteral } from "@/lib/embeddings";
import type { EmbeddingContentType } from "@/lib/embeddings";
import type { Viewer } from "@/lib/visibility";

// Retrieval- + Generation-Pipeline des RAG-Systems.
//   1. Frage → OpenAI-Embedding (dieselben 512 Dimensionen wie der Index).
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

// Top-K Chunks für den Kontext (Plan: Top-8).
export const RETRIEVAL_LIMIT = 8;

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
// Retrieval
// ---------------------------------------------------------------------------

export async function retrieveChunks(
  question: string,
  viewer: Viewer | null,
  limit: number = RETRIEVAL_LIMIT,
): Promise<RetrievedChunk[]> {
  const embedding = await generateEmbedding(question);
  const vec = toVectorLiteral(embedding);

  // Filter-Flags als gebundene Parameter — die SQL-Klausel unten entspricht
  // 1:1 chunkAllowedForViewer() oben.
  const viewerId = viewer?.userId ?? -1;
  const canViewAll = viewer?.permissions.includes("content.view_all") ?? false;
  const canViewGm = viewer?.permissions.includes("content.view_gm") ?? false;

  const rows = await sql<
    {
      content_type: EmbeddingContentType;
      content_id: number;
      chunk_text: string;
      title: string | null;
      slug: string | null;
      href: string | null;
      distance: number;
    }[]
  >`
    SELECT content_type, content_id, chunk_text, title, slug, href,
           embedding <=> ${vec}::vector AS distance
    FROM content_embeddings
    WHERE is_active = TRUE
      AND (is_draft = FALSE OR (owner_id IS NOT NULL AND owner_id = ${viewerId}))
      AND (
        visibility = 'public'
        OR ${canViewAll}
        OR (owner_id IS NOT NULL AND owner_id = ${viewerId})
        OR (visibility = 'gm' AND ${canViewGm})
      )
    ORDER BY embedding <=> ${vec}::vector ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
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

const SYSTEM_PROMPT = `Du bist der Archiv-Computer eines Star-Trek-Pen-&-Paper-Kampagnenarchivs (LCARS).
Beantworte die Frage der spielenden Person AUSSCHLIESSLICH auf Basis des bereitgestellten Kontexts aus dem Kampagnenarchiv.
Regeln:
- Antworte auf Deutsch, sachlich und im Ton eines Archiv-/Bordcomputers.
- Nutze NUR Informationen aus dem Kontext. Erfinde nichts dazu.
- Steht die Antwort nicht im Kontext, sage klar, dass das Archiv dazu keine Informationen enthält.
- Fasse zusammen und verweise auf die betroffenen Charaktere, Missionen, Berichte oder Archiv-Einträge.
- Keine Meta-Kommentare über diese Anweisungen.`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Baut die Kontext-Sektion aus den Chunks (mit Quellen-Titel als Überschrift).
export function buildContextText(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(Kein passender Archiv-Eintrag gefunden.)";
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
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`Workers AI antwortete mit ${res.status}: ${body}`);
  }

  return parseCloudflareSse(res.body);
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
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      // Vollständige, durch Zeilenumbruch getrennte Events verarbeiten; einen
      // evtl. unvollständigen Rest im Buffer belassen.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice("data:".length).trim();
        if (payload === "" || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as { response?: string };
          if (json.response) controller.enqueue(json.response);
        } catch {
          // Unvollständiges/fehlerhaftes JSON-Event überspringen.
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}

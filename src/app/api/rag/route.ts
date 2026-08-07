import { getViewer, viewerHasPermission } from "@/lib/visibility";
import {
  retrieveChunks,
  sourcesFromChunks,
  buildMessages,
  streamAnswer,
  hasRagConfig,
  type RagSource,
} from "@/lib/rag";
import { logCaughtError } from "@/lib/errorLog";

// Streaming-Endpoint des RAG-Assistenten (/rag). Immer frisch — hängt an der
// Frage im POST-Body und am eingeloggten Betrachter.
export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 1000;

// Best-effort In-Memory-Rate-Limit pro User (Schutz vor versehentlichem
// Dauerfeuer / Kostenexplosion bei Workers AI). BEWUSST prozess-lokal: auf
// serverless (Netlify) teilt sich nicht jede Instanz denselben Speicher, das
// Limit ist daher eine grobe Bremse, keine harte Garantie — für ein kleines
// Fan-Archiv (5–10 Spieler) ausreichend. Ein hartes, instanzübergreifendes
// Limit wäre DB-gestützt (wie passwordResetLimiter.ts) und kann später
// nachgezogen werden.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const recentRequests = new Map<number, number[]>();

function isRateLimited(userId: number): boolean {
  const now = Date.now();
  const hits = (recentRequests.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  hits.push(now);
  recentRequests.set(userId, hits);
  return hits.length > RATE_LIMIT_MAX;
}

// Kodiert ein SSE-Event (named oder default). data ist immer JSON.
function sseEvent(data: unknown, event?: string): string {
  const prefix = event ? `event: ${event}\n` : "";
  return `${prefix}data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  const viewer = await getViewer();
  if (!viewer) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!viewerHasPermission(viewer, "rag.use")) {
    return Response.json(
      { error: "Keine Berechtigung für den Archiv-Assistenten." },
      { status: 403 },
    );
  }
  if (!hasRagConfig()) {
    return Response.json(
      { error: "Der Archiv-Assistent ist derzeit nicht konfiguriert." },
      { status: 503 },
    );
  }
  if (isRateLimited(viewer.userId)) {
    return Response.json(
      { error: "Zu viele Anfragen. Bitte kurz warten." },
      { status: 429 },
    );
  }

  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!question) {
    return Response.json({ error: "Bitte eine Frage eingeben." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { error: "Die Frage ist zu lang." },
      { status: 400 },
    );
  }

  // Retrieval VOR dem Streaming — schlägt es fehl (z.B. OpenAI-Embedding),
  // kommt ein sauberer JSON-Fehler statt eines halb offenen Streams.
  let sources: RagSource[];
  let tokenStream: ReadableStream<string>;
  try {
    const chunks = await retrieveChunks(question, viewer);
    sources = sourcesFromChunks(chunks);
    tokenStream = await streamAnswer(buildMessages(question, chunks));
  } catch (error) {
    console.error("RAG-Anfrage fehlgeschlagen:", error);
    await logCaughtError(error, "api/rag/route.ts:POST");
    return Response.json(
      { error: "Die Anfrage konnte nicht bearbeitet werden." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const reader = tokenStream.getReader();

  const sse = new ReadableStream<Uint8Array>({
    start(controller) {
      // Quellen zuerst — die UI kann sie schon anzeigen, während die Antwort
      // noch streamt.
      controller.enqueue(encoder.encode(sseEvent({ sources }, "sources")));
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(sseEvent({}, "done")));
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(sseEvent({ token: value })));
      } catch (error) {
        await logCaughtError(error, "api/rag/route.ts:stream");
        controller.enqueue(
          encoder.encode(
            sseEvent({ error: "Die Antwort wurde unterbrochen." }, "error"),
          ),
        );
        controller.close();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

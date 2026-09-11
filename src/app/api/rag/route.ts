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
import { checkAndRecordRagRequest } from "@/lib/ragLimiter";

// Streaming-Endpoint des RAG-Assistenten (/rag). Immer frisch — hängt an der
// Frage im POST-Body und am eingeloggten Betrachter (per-Request, nie
// statisch prerendert).
// Streaming-Antworten des LLM können mehrere Sekunden dauern; die Default-
// Funktionslaufzeit ist zu knapp und schneidet lange Antworten ab
// („Verbindung zum Anbieter verloren"). So lang wie möglich anfordern (die
// Plattform kappt ggf. auf ihr Maximum). Zusätzlich hält ein Heartbeat unten
// die Verbindung während der Modell-Denkpausen offen.
export const maxDuration = 60;

const MAX_QUESTION_LENGTH = 1000;

// Ratelimit pro User — DB-gestützt (src/lib/ragLimiter.ts). Lag bis zuletzt
// als Map im Modulscope genau hier: auf serverless bekommt jede
// Funktionsinstanz ihre eigene, das Limit skalierte damit mit der
// Instanzzahl mit, statt zu bremsen. Am anderen Ende hängt ein abrechnender
// Anbieter, deshalb teilen sich die Instanzen den Zähler jetzt über die
// Datenbank — dasselbe Muster wie bei Login und Passwort-Reset.

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
      { error: "Keine Berechtigung für den Datenbank-Assistenten." },
      { status: 403 },
    );
  }
  if (!hasRagConfig()) {
    return Response.json(
      { error: "Der Datenbank-Assistent ist derzeit nicht konfiguriert." },
      { status: 503 },
    );
  }
  if (await checkAndRecordRagRequest(viewer.userId)) {
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

  // Ein einziger Pump in start() (statt pull()) plus ein Heartbeat: solange das
  // Modell noch „denkt" (keine Tokens), sendet der Heartbeat alle paar Sekunden
  // einen SSE-Kommentar (`: ping`), damit Proxy/Plattform die vermeintlich
  // untätige Verbindung nicht schließen. SSE-Kommentare ignoriert der Client
  // (kein data:-Feld), sie erscheinen also nicht in der Antwort.
  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Quellen zuerst — die UI kann sie schon anzeigen, während die Antwort
      // noch streamt (flusht zugleich die Header früh).
      controller.enqueue(encoder.encode(sseEvent({ sources }, "sources")));

      let closed = false;
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Controller bereits geschlossen — ignorieren.
        }
      }, 10_000);

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(encoder.encode(sseEvent({ token: value })));
        }
        controller.enqueue(encoder.encode(sseEvent({}, "done")));
      } catch (error) {
        await logCaughtError(error, "api/rag/route.ts:stream");
        controller.enqueue(
          encoder.encode(
            sseEvent({ error: "Die Antwort wurde unterbrochen." }, "error"),
          ),
        );
      } finally {
        closed = true;
        clearInterval(heartbeat);
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

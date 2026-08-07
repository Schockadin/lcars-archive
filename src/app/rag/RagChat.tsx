"use client";
import { useRef, useState } from "react";
import Link from "next/link";

// Eine Quelle unter einer Antwort (dedupliziert je Inhalt, siehe
// sourcesFromChunks in src/lib/rag.ts).
interface Source {
  contentType: string;
  title: string;
  href: string | null;
}

interface Turn {
  question: string;
  answer: string;
  sources: Source[];
  // Läuft die Antwort noch (Streaming) bzw. brach sie mit einem Fehler ab.
  pending: boolean;
  error?: string;
}

// Liest einen SSE-Stream (Response.body) und ruft handler je Event auf. Events
// sind durch Leerzeilen getrennt; jedes trägt optional eine `event:`-Zeile und
// eine `data:`-Zeile (JSON). Spiegelt das Framing des Endpoints
// (src/app/api/rag/route.ts).
async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      let eventName = "message";
      let dataLine = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        onEvent(eventName, JSON.parse(dataLine));
      } catch {
        // Unvollständiges Event überspringen.
      }
    }
  }
}

export default function RagChat({ configured }: { configured: boolean }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  // Index des aktuell streamenden Turns (für die token-Updates).
  const activeIndex = useRef<number>(-1);

  async function ask(question: string) {
    setBusy(true);
    const index = turns.length;
    activeIndex.current = index;
    setTurns((prev) => [
      ...prev,
      { question, answer: "", sources: [], pending: true },
    ]);

    const patch = (fn: (t: Turn) => Turn) =>
      setTurns((prev) => prev.map((t, i) => (i === index ? fn(t) : t)));

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        patch((t) => ({
          ...t,
          pending: false,
          error: data?.error ?? "Die Anfrage ist fehlgeschlagen.",
        }));
        return;
      }

      await readSse(res.body, (event, data) => {
        if (event === "sources") {
          const sources = (data as { sources?: Source[] }).sources ?? [];
          patch((t) => ({ ...t, sources }));
        } else if (event === "error") {
          const message = (data as { error?: string }).error;
          patch((t) => ({ ...t, error: message, pending: false }));
        } else if (event === "done") {
          patch((t) => ({ ...t, pending: false }));
        } else {
          const token = (data as { token?: string }).token ?? "";
          if (token) patch((t) => ({ ...t, answer: t.answer + token }));
        }
      });
      patch((t) => ({ ...t, pending: false }));
    } catch {
      patch((t) => ({
        ...t,
        pending: false,
        error: "Verbindung zum Assistenten verloren.",
      }));
    } finally {
      setBusy(false);
      activeIndex.current = -1;
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    void ask(q);
  }

  if (!configured) {
    return (
      <p className="lcars-empty-state">
        Der Archiv-Assistent ist derzeit nicht konfiguriert (es fehlen die
        API-Schlüssel). Bitte später erneut versuchen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {turns.length === 0 ? (
        <p className="lcars-empty-state">
          Stelle eine Frage zum Kampagneninhalt – z.B. „Was wissen wir über die
          Tholianer?“. Der Assistent antwortet ausschließlich auf Basis der
          Archiv-Datenbank und zeigt die genutzten Quellen an.
        </p>
      ) : (
        <ol className="flex flex-col gap-[16px] list-none p-0 m-0">
          {turns.map((turn, i) => (
            <li key={i} className="flex flex-col gap-[8px]">
              <p className="lcars-eyebrow" style={{ margin: 0 }}>
                {turn.question}
              </p>
              <div className="lcars-text" style={{ whiteSpace: "pre-wrap" }}>
                {turn.answer}
                {turn.pending && !turn.answer ? "…" : null}
              </div>
              {turn.error ? (
                <p className="lcars-text" style={{ color: "var(--lcars-red)" }}>
                  {turn.error}
                </p>
              ) : null}
              {turn.sources.length > 0 ? (
                <div className="flex flex-col gap-[4px]">
                  <p className="lcars-eyebrow" style={{ margin: 0 }}>
                    Quellen
                  </p>
                  <ul className="flex flex-wrap gap-[8px] list-none p-0 m-0">
                    {turn.sources.map((s, j) => (
                      <li key={j}>
                        {s.href ? (
                          <Link
                            href={s.href}
                            className="lcars-pill-btn--outline"
                          >
                            {s.title}
                          </Link>
                        ) : (
                          <span className="lcars-text-light">{s.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-col sm:flex-row gap-[8px]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage an das Archiv…"
          maxLength={1000}
          disabled={busy}
          className="rounded-lcars-pill lcars-input flex-1"
          style={{ minWidth: 0 }}
        />
        <button
          type="submit"
          disabled={busy || input.trim() === ""}
          className="lcars-pill-btn--outline w-full sm:w-auto"
        >
          {busy ? "Frage läuft…" : "Fragen"}
        </button>
      </form>
    </div>
  );
}

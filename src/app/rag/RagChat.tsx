"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  RAG_PROMPTS,
  fillPrompt,
  promptCaret,
  promptNeedsInput,
  type RagPromptTemplate,
} from "@/lib/ragPrompts";
import Link from "next/link";
import MarkdownLite from "./MarkdownLite";
import {
  CharactersNavIcon,
  MissionsNavIcon,
  DatabaseNavIcon,
} from "@/lib/icons";

// Eine Quelle unter einer Antwort (dedupliziert je Inhalt, siehe
// sourcesFromChunks in src/lib/rag.ts).
interface Source {
  contentType: string;
  title: string;
  href: string | null;
}

// Icon je Inhaltstyp für die Quellen-Liste — gibt den Links optischen Kontext
// (Charakter/Mission/Archiv), analog zum Tabellen-Icon im DB-Explorer.
function sourceIcon(contentType: string): ReactNode {
  switch (contentType) {
    case "character":
      return <CharactersNavIcon />;
    case "mission":
    case "mission_log":
      return <MissionsNavIcon />;
    default:
      // archive_entry, dialogue
      return <DatabaseNavIcon />;
  }
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(question: string) {
    setBusy(true);
    const index = turns.length;
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
      // Bricht die Verbindung mitten im Stream ab, ist die bis dahin
      // empfangene Teil-Antwort trotzdem nützlich — sie bleibt stehen, der
      // Hinweis fällt je nachdem weicher aus.
      patch((t) => ({
        ...t,
        pending: false,
        error: t.answer
          ? "Verbindung unterbrochen — die Antwort ist womöglich unvollständig."
          : "Verbindung zum Assistenten verloren.",
      }));
    } finally {
      setBusy(false);
    }
  }

  // Vorlage anklicken: Braucht sie keine Eingabe, geht die Frage sofort raus.
  // Sonst landet der Text im Eingabefeld und der Cursor springt an die Stelle,
  // die noch auszufüllen ist — die Vorlage ist dann ein Satzanfang, kein
  // fertiges Formular.
  function applyPrompt(t: RagPromptTemplate) {
    if (busy) return;
    if (!promptNeedsInput(t)) {
      void ask(t.template);
      return;
    }
    const text = fillPrompt(t);
    const caret = promptCaret(t) ?? text.length;
    setInput(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
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
        Der Datenbank-Assistent ist derzeit nicht konfiguriert (es fehlen die
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
          Datenbank und zeigt die genutzten Quellen an.
        </p>
      ) : (
        <ol className="flex flex-col gap-[16px] list-none p-0 m-0">
          {turns.map((turn, i) => (
            <li key={i} className="flex flex-col gap-[8px]">
              <p className="lcars-eyebrow" style={{ margin: 0 }}>
                {turn.question}
              </p>
              <div className="mission-body lcars-text">
                {turn.answer ? (
                  <MarkdownLite text={turn.answer} />
                ) : turn.pending ? (
                  <p>…</p>
                ) : null}
              </div>
              {turn.error ? (
                <p className="lcars-text" style={{ color: "var(--lcars-quinary)" }}>
                  {turn.error}
                </p>
              ) : null}
              {turn.sources.length > 0 ? (
                <div className="flex flex-col gap-[4px]">
                  <p className="lcars-eyebrow" style={{ margin: 0 }}>
                    Quellen
                  </p>
                  {/* Als Link-Liste (Icon + Titel) im Stil der Tabellen-Links
                      unter /admin/db (db-explorer-item), nicht als Pill-Buttons. */}
                  <ul className="list-none p-0 m-0 flex flex-col gap-[2px]">
                    {turn.sources.map((s, j) => (
                      <li key={j}>
                        {s.href ? (
                          <Link href={s.href} className="db-explorer-item">
                            <span className="db-explorer-item-icon">
                              {sourceIcon(s.contentType)}
                            </span>
                            <span className="db-explorer-item-name">
                              {s.title}
                            </span>
                          </Link>
                        ) : (
                          <span className="db-explorer-item">
                            <span className="db-explorer-item-icon">
                              {sourceIcon(s.contentType)}
                            </span>
                            <span className="db-explorer-item-name">
                              {s.title}
                            </span>
                          </span>
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

      {/* Einstiegs-Vorlagen. Ein leeres Eingabefeld verrät nicht, dass der
          Assistent auch Rückschauen über mehrere Berichte oder Kurzprofile
          liefern kann. */}
      <div className="flex flex-wrap gap-[8px]">
        {RAG_PROMPTS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            disabled={busy}
            onClick={() => applyPrompt(t)}
            className="lcars-pill-btn--outline text-[12px] px-[12px] py-[4px] disabled:opacity-40"
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col sm:flex-row gap-[8px]"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage an die Datenbank…"
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

"use client";
import { useActionState, useMemo, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import { LcarsListFilterInput } from "@/components/lcars";
import {
  SOURCE_TYPE_LABELS,
  categoryVisual,
  fmtDate,
} from "@/lib/timelineTypes";
import type { StoredInferredEvent } from "@/lib/timelineInference";
import {
  deleteEventAction,
  inferEventsAction,
  type TimelineActionState,
} from "./actions";

const initialState: TimelineActionState = {};

// Ein Inhalt, aus dem sich Ereignisse ableiten lassen — nur das, was die
// Liste anzeigt (der Text selbst bleibt auf dem Server, siehe page.tsx).
export interface SourceRow {
  sourceType: keyof typeof SOURCE_TYPE_LABELS;
  slug: string;
  title: string;
  length: number;
  inferredCount: number;
}

export default function TimelineInferencePanel({
  sources,
  events,
  ragConfigured,
}: {
  sources: SourceRow[];
  events: StoredInferredEvent[];
  ragConfigured: boolean;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => s.title.toLowerCase().includes(q));
  }, [sources, query]);

  return (
    <div className="flex flex-col gap-[24px]">
      <section className="flex flex-col gap-[10px]">
        <h2 className="lcars-eyebrow">Ereignisse ableiten</h2>
        {!ragConfigured && (
          <p className="text-lcars-primary-ink text-[13px]">
            Ohne die Zugänge des Datenbank-Assistenten (OPENAI_API_KEY,
            CLOUDFLARE_AI_API_TOKEN) lässt sich nichts ableiten. Die Chronologie
            funktioniert trotzdem — dann eben nur aus den gepflegten Angaben und
            den Marken im Text.
          </p>
        )}

        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Inhalte filtern"
        />

        {visible.length === 0 ? (
          <p className="lcars-empty-state">Kein Inhalt für diesen Filter.</p>
        ) : (
          <ul className="flex flex-col gap-[8px]">
            {visible.map((source) => (
              <SourceRowForm
                key={`${source.sourceType}:${source.slug}`}
                source={source}
                disabled={!ragConfigured}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-[10px]">
        <h2 className="lcars-eyebrow">
          Abgeleitete Ereignisse ({events.length})
        </h2>
        <p className="text-lcars-ink-dim text-[12px]">
          Sie stehen auf /chronologie mit dem Hinweis „aus dem Text
          abgeleitet&ldquo;. Was nicht stimmt, entfernst du hier — der Text des
          Inhalts bleibt davon unberührt.
        </p>
        {events.length === 0 ? (
          <p className="lcars-empty-state">
            Noch nichts abgeleitet. Die Chronologie zeigt bis dahin nur die
            gepflegten Angaben und die Marken im Text.
          </p>
        ) : (
          <ul className="flex flex-col gap-[8px]">
            {events.map((event) => (
              <EventRowForm key={event.id} event={event} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SourceRowForm({
  source,
  disabled,
}: {
  source: SourceRow;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    inferEventsAction,
    initialState,
  );

  return (
    <li className="flex flex-col gap-[4px] border-b border-lcars-border pb-[8px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="flex-1 min-w-[200px] flex flex-col">
          <strong className="text-lcars-ink-data">{source.title}</strong>
          <span className="text-lcars-ink-dim text-[12px]">
            {SOURCE_TYPE_LABELS[source.sourceType]} ·{" "}
            {source.length === 0
              ? "kein Text"
              : `${source.length} Zeichen Text`}
            {source.inferredCount > 0 &&
              ` · ${source.inferredCount} abgeleitet`}
          </span>
        </span>
        <form action={formAction}>
          <input type="hidden" name="sourceType" value={source.sourceType} />
          <input type="hidden" name="slug" value={source.slug} />
          <button
            type="submit"
            className="lcars-pill-btn--outline disabled:opacity-40"
            disabled={pending || disabled || source.length === 0}
          >
            {pending ? "Liest…" : "Ereignisse ableiten"}
          </button>
        </form>
      </div>
      {state.error && <FormError message={state.error} />}
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </li>
  );
}

function EventRowForm({ event }: { event: StoredInferredEvent }) {
  const [state, formAction, pending] = useActionState(
    deleteEventAction,
    initialState,
  );
  const visual = categoryVisual(event.category);

  return (
    <li className="flex flex-col gap-[4px] border-b border-lcars-border pb-[8px]">
      <div className="flex flex-wrap items-start gap-[10px]">
        <span className="flex-1 min-w-[200px] flex flex-col">
          <strong className="text-lcars-ink-data">
            {fmtDate(event.date)} · {event.title}
          </strong>
          {event.detail && (
            <span className="text-lcars-ink text-[13px]">{event.detail}</span>
          )}
          <span className="text-lcars-ink-dim text-[12px]">
            {visual.label} · {SOURCE_TYPE_LABELS[event.sourceType]}{" "}
            {event.sourceSlug}
            {/* Die Sicherheit ist ein Hinweis des Modells, kein Maß — sie
                steht deshalb als Nebentext und nicht als Balken. */}
            {event.confidence !== null &&
              ` · Sicherheit ${Math.round(event.confidence * 100)} %`}
          </span>
        </span>
        <form action={formAction}>
          <input type="hidden" name="id" value={event.id} />
          <button
            type="submit"
            className="lcars-pill-btn--outline disabled:opacity-50"
            disabled={pending}
            onClick={confirmSubmit(
              `„${event.title}" aus der Chronologie entfernen?`,
            )}
          >
            {pending ? "Entfernt…" : "Entfernen"}
          </button>
        </form>
      </div>
      {state.error && <FormError message={state.error} />}
    </li>
  );
}

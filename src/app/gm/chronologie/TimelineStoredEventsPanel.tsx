"use client";
import { useActionState } from "react";
import { FormError } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  SOURCE_TYPE_LABELS,
  categoryVisual,
  fmtDate,
} from "@/lib/timelineTypes";
import type { StoredTimelineEvent } from "@/lib/timelineStoredEvents";
import { deleteTimelineEventAction, type TimelineActionState } from "./actions";

const initialState: TimelineActionState = {};

// Kein RAG-Werkzeug: Diese Liste dient nur dazu, bereits gespeicherte freie
// Events und Alt-Ableitungen weiterhin aufräumen zu können.
export default function TimelineStoredEventsPanel({
  events,
}: {
  events: StoredTimelineEvent[];
}) {
  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="lcars-eyebrow">
        Gespeicherte Ereignisse ({events.length})
      </h2>
      <p className="text-lcars-ink-dim text-[12px]">
        Hier stehen freie Ereignisse aus Formular und CSV sowie noch vorhandene
        Alt-Ableitungen. Neue Ereignisse werden nicht mehr aus dem
        Datenbank-Assistenten abgeleitet.
      </p>
      {events.length === 0 ? (
        <p className="lcars-empty-state">Keine gespeicherten Ereignisse.</p>
      ) : (
        <ul className="flex flex-col gap-[8px]">
          {events.map((event) => (
            <EventRowForm key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EventRowForm({ event }: { event: StoredTimelineEvent }) {
  const [state, formAction, pending] = useActionState(
    deleteTimelineEventAction,
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
            {visual.label} ·{" "}
            {event.origin === "manual"
              ? "von Hand oder per CSV eingetragen"
              : `früher aus ${event.sourceType ? SOURCE_TYPE_LABELS[event.sourceType] : "einem Inhalt"} abgeleitet`}
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

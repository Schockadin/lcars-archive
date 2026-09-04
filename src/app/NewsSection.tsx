"use client";
import { useState } from "react";
import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { NewsFeedItem } from "@/lib/recentActivity";
import { dismissNewsAction, markAllNewsSeenAction } from "@/app/actions/news";
import { fmtDate } from "@/lib/missionFormat";
import { CONTENT_TYPE_LABEL } from "@/lib/contentTypeFormat";

// Farbe + Verb je News-Art (neu/bearbeitet/gelöscht) — Vorgabe: grün = neu,
// blau = bearbeitet, rot = gelöscht.
const KIND_META: Record<
  NewsFeedItem["kind"],
  { color: string; verb: string }
> = {
  created: { color: "var(--lcars-senary)", verb: "Neu" },
  updated: { color: "var(--lcars-tertiary)", verb: "Bearbeitet" },
  deleted: { color: "var(--lcars-quinary)", verb: "Gelöscht" },
};

function metaLine(item: NewsFeedItem): string {
  const { verb } = KIND_META[item.kind];
  // Für Löschungen gibt es keinen Inhaltstyp mehr (das Ziel existiert nicht
  // mehr) — dort steht deshalb das neutrale „Inhalt".
  const typeLabel =
    item.targetType === "deletion"
      ? "Inhalt"
      : CONTENT_TYPE_LABEL[item.targetType];
  const by = item.authorName ?? "Spielleitung";
  return `${typeLabel} · ${verb} von ${by}`;
}

function NewsRow({
  item,
  onDismiss,
}: {
  item: NewsFeedItem;
  onDismiss: (item: NewsFeedItem) => void;
}) {
  const style = { "--news-color": KIND_META[item.kind].color } as React.CSSProperties;

  const inner = (
    <>
      <span className="news-row-rail" />
      <span className="news-row-body">
        <span className="news-row-title">{item.title}</span>
        <span className="news-row-meta">
          {metaLine(item)} · {fmtDate(item.timestamp)}
        </span>
      </span>
    </>
  );

  // 20px-Schließen-Button (X) blendet die News aus. preventDefault/
  // stopPropagation, damit ein Klick auf das X nicht dem umschließenden Link
  // folgt.
  const dismissBtn = (
    <button
      type="button"
      aria-label="News ausblenden"
      title="Ausblenden"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss(item);
      }}
      className="news-row-dismiss"
    >
      ×
    </button>
  );

  return (
    <div className="news-row-wrap">
      {item.href ? (
        <Link href={item.href} className="news-row" style={style}>
          {inner}
        </Link>
      ) : (
        <div className="news-row news-row--static" style={style}>
          {inner}
        </div>
      )}
      {dismissBtn}
    </div>
  );
}

// Persistenter, nach Datum sortierter News-Feed (grün/blau/rot). Anders als
// früher bleiben die News über Dashboard-Besuche hinweg sichtbar; jede lässt
// sich per X einzeln ausblenden (dismissNewsAction) und verschwindet außerdem,
// sobald der zugehörige Inhalt aufgerufen wird (MarkNewsSeen). Offene
// Gespräche leben in einer eigenen Sektion (OpenDialoguesSection.tsx).
export default function NewsSection({ items }: { items: NewsFeedItem[] }) {
  const [visible, setVisible] = useState(items);
  const [markingAll, setMarkingAll] = useState(false);

  function dismiss(item: NewsFeedItem) {
    // Optimistisch entfernen, dann serverseitig als „gesehen"/gelesen markieren.
    setVisible((prev) => prev.filter((i) => i.key !== item.key));
    void dismissNewsAction(item.targetType, item.targetKey, item.timestamp);
  }

  // Erst serverseitig als gelesen speichern, DANN leeren — schlägt der Server-
  // Aufruf fehl, bleibt die Liste stehen (statt sie nur optisch zu leeren,
  // ohne dass etwas persistiert wurde).
  async function markAllRead() {
    const snapshot = visible;
    setMarkingAll(true);
    try {
      const res = await markAllNewsSeenAction(
        snapshot.map((i) => ({
          targetType: i.targetType,
          targetKey: i.targetKey,
          timestamp: i.timestamp,
        })),
      );
      // Nur bei bestätigter Speicherung leeren — sonst bleibt die Liste stehen.
      if (res.ok) setVisible([]);
    } catch {
      // Fehler: Liste bewusst NICHT leeren (es wurde nichts gespeichert).
    } finally {
      setMarkingAll(false);
    }
  }

  if (visible.length === 0) return null;

  return (
    <LcarsDataRow
      value={visible.length}
      label="News"
      defaultOpen
    >
      <div className="flex flex-col gap-[8px]">
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll}
          className="lcars-pill-btn--outline self-end text-[12px] disabled:opacity-50"
        >
          {markingAll ? "Wird gespeichert…" : "Alles als gelesen markieren"}
        </button>
        <div className="news-scroll">
          {visible.map((item) => (
            <NewsRow key={item.key} item={item} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </LcarsDataRow>
  );
}

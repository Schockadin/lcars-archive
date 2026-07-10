"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { FollowEntry, FollowTargetType } from "@/lib/follows";
import { endFollow } from "@/app/actions/follows";

const TYPE_LABELS: Record<FollowTargetType, string> = {
  mission: "Mission",
  archive_entry: "Archiv-Eintrag",
  character: "Charakter",
  mission_log: "Einsatzbericht",
};

const TYPE_COLORS: Record<FollowTargetType, string> = {
  mission: "var(--lcars-green)",
  archive_entry: "var(--lcars-purple)",
  character: "var(--lcars-amber)",
  mission_log: "var(--lcars-blue)",
};

function statusLabel(item: FollowEntry): string {
  if (item.bookmarked && item.subscribed) return "Gespeichert & Abonniert";
  return item.bookmarked ? "Gespeichert" : "Abonniert";
}

function itemKey(item: Pick<FollowEntry, "targetType" | "slug">): string {
  return `${item.targetType}-${item.slug}`;
}

// Rein client-seitige Liste (wie FollowButtons.tsx): endFollow() räumt in
// der DB auf, die entfernte Zeile verschwindet hier direkt aus dem lokalen
// State — kein revalidatePath/Reload nötig, ein erneuter Seitenaufruf zeigt
// ohnehin den echten (identischen) Stand.
export default function FollowList({ items }: { items: FollowEntry[] }) {
  const [list, setList] = useState(items);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (list.length === 0) {
    return <p className="lcars-empty-state">Du folgst aktuell nichts.</p>;
  }

  return (
    <div className="flex flex-col gap-[6px]">
      {list.map((item) => {
        const key = itemKey(item);
        return (
          <div key={key} className="flex items-center gap-[8px]">
            <Link
              href={item.href}
              className="mission-akte flex-1"
              style={
                {
                  "--mission-color": TYPE_COLORS[item.targetType],
                } as React.CSSProperties
              }
            >
              <span className="mission-akte-rail" />
              <span className="mission-akte-body text-left">
                <span className="mission-akte-title block">{item.title}</span>
                <span className="mission-akte-meta">
                  <span>
                    <b>Typ</b> {TYPE_LABELS[item.targetType]}
                  </span>
                  <span>
                    <b>Status</b> {statusLabel(item)}
                  </span>
                </span>
              </span>
            </Link>
            <button
              type="button"
              disabled={pendingKey === key}
              className="lcars-pill-btn--outline shrink-0 disabled:opacity-50"
              onClick={() => {
                setPendingKey(key);
                startTransition(async () => {
                  await endFollow(item.targetType, item.slug);
                  setList((current) => current.filter((i) => itemKey(i) !== key));
                  setPendingKey(null);
                });
              }}
            >
              Follow beenden
            </button>
          </div>
        );
      })}
    </div>
  );
}

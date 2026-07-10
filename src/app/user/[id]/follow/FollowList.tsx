"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { FollowedContent, FollowTargetType } from "@/lib/follows";
import { toggleSubscription } from "@/app/actions/follows";
import { XIcon } from "@/lib/icons";

const TYPE_LABELS: Record<FollowTargetType, string> = {
  mission: "Mission",
  archive_entry: "Archiv-Eintrag",
  character: "Charakter",
};

const TYPE_COLORS: Record<FollowTargetType, string> = {
  mission: "var(--lcars-green)",
  archive_entry: "var(--lcars-purple)",
  character: "var(--lcars-amber)",
};

function itemKey(item: Pick<FollowedContent, "targetType" | "slug">): string {
  return `${item.targetType}-${item.slug}`;
}

// Rein client-seitige Liste (wie FollowButtons.tsx): toggleSubscription(...,
// false) räumt in der DB auf, die entfernte Zeile verschwindet hier direkt
// aus dem lokalen State — kein revalidatePath/Reload nötig, ein erneuter
// Seitenaufruf zeigt ohnehin den echten (identischen) Stand. Ein eventuelles
// Lesezeichen auf demselben Inhalt bleibt dabei unangetastet (siehe
// toggleSubscription statt eines vollständigen Follow-Removes) — Follows
// verwalten hier nur Abos, keine Lesezeichen (die leben auf dem Dashboard).
export default function FollowList({ items }: { items: FollowedContent[] }) {
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
          <div key={key} className="relative">
            <Link
              href={item.href}
              className="mission-akte"
              style={
                {
                  "--mission-color": TYPE_COLORS[item.targetType],
                } as React.CSSProperties
              }
            >
              <span className="mission-akte-rail" />
              <span className="mission-akte-body text-left pr-[48px]">
                <span className="mission-akte-title block">{item.title}</span>
                <span className="mission-akte-meta">
                  <span>
                    <b>Typ</b> {TYPE_LABELS[item.targetType]}
                  </span>
                </span>
              </span>
            </Link>
            <button
              type="button"
              disabled={pendingKey === key}
              className="lcars-icon-btn lcars-icon-btn--danger absolute top-[6px] right-[6px] disabled:opacity-50"
              aria-label="Follow beenden"
              title="Follow beenden"
              onClick={() => {
                setPendingKey(key);
                startTransition(async () => {
                  await toggleSubscription(item.targetType, item.slug, false);
                  setList((current) => current.filter((i) => itemKey(i) !== key));
                  setPendingKey(null);
                });
              }}
            >
              <XIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}

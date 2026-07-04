"use client";
import { useEffect, useState } from "react";
import {
  getFollowState,
  toggleBookmark,
  toggleSubscription,
  type FollowState,
} from "@/app/actions/follows";
import type { FollowTargetType } from "@/lib/follows";

// Rendert nichts, solange nicht bekannt ist, ob eine Session existiert (und
// dauerhaft nichts für anonyme Besucher) — bewusst per Client-Fetch auf eine
// Server Action gelöst statt die statisch vorgerenderten Missions-/
// Archiv-Detailseiten selbst dynamisch zu machen (gleiches Muster wie beim
// Home-Button in der Sidebar).
export default function FollowButtons({
  targetType,
  targetSlug,
  subscribeOnly = false,
}: {
  targetType: FollowTargetType;
  targetSlug: string;
  // Nur den Abo-Umschalter zeigen (kein "Merken") — z.B. für Dialoge, wo
  // Bookmarks fachlich keinen Sinn ergeben.
  subscribeOnly?: boolean;
}) {
  const [state, setState] = useState<FollowState | null>(null);
  const [pending, setPending] = useState<"bookmark" | "subscribe" | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFollowState(targetType, targetSlug).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [targetType, targetSlug]);

  if (!state?.loggedIn) return null;

  async function handleBookmark() {
    if (!state) return;
    const next = !state.bookmarked;
    setState({ ...state, bookmarked: next });
    setPending("bookmark");
    await toggleBookmark(targetType, targetSlug, next);
    setPending(null);
  }

  async function handleSubscribe() {
    if (!state) return;
    const next = !state.subscribed;
    setState({ ...state, subscribed: next });
    setPending("subscribe");
    await toggleSubscription(targetType, targetSlug, next);
    setPending(null);
  }

  return (
    <div className="follow-buttons">
      {!subscribeOnly && (
        <button
          type="button"
          className={`lcars-switch${state.bookmarked ? " lcars-switch--active" : ""}`}
          disabled={pending === "bookmark"}
          onClick={handleBookmark}
        >
          {state.bookmarked ? "Gemerkt" : "Merken"}
        </button>
      )}
      <button
        type="button"
        className={`lcars-switch${state.subscribed ? " lcars-switch--active" : ""}`}
        disabled={pending === "subscribe"}
        onClick={handleSubscribe}
      >
        {state.subscribed ? "Abonniert" : "Abonnieren"}
      </button>
    </div>
  );
}

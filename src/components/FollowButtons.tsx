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

  // Kein useOptimistic hier: der Stand kommt per Client-Fetch (useEffect
  // oben), nicht als Prop von einer Server Component — es gibt also keine
  // "echte" Basis, auf die useOptimistic nach der Transition zurückfallen
  // könnte. Stattdessen manueller Rollback: optimistisch setzen, und falls
  // die Server Action einen anderen Wert bestätigt als erwartet (z.B.
  // Session zwischenzeitlich abgelaufen), auf den zuletzt bekannten Stand
  // zurückfallen statt den (dann falschen) optimistischen Wert stehen zu
  // lassen.
  async function handleBookmark() {
    if (!state) return;
    const previous = state;
    const next = !state.bookmarked;
    setState({ ...state, bookmarked: next });
    setPending("bookmark");
    const confirmed = await toggleBookmark(targetType, targetSlug, next);
    setPending(null);
    if (confirmed !== next) setState(previous);
  }

  async function handleSubscribe() {
    if (!state) return;
    const previous = state;
    const next = !state.subscribed;
    setState({ ...state, subscribed: next });
    setPending("subscribe");
    const confirmed = await toggleSubscription(targetType, targetSlug, next);
    setPending(null);
    if (confirmed !== next) setState(previous);
  }

  return (
    <div className="follow-buttons">
      {!subscribeOnly && (
        <button
          type="button"
          className={`lcars-usernav-pill${state.bookmarked ? " lcars-usernav-pill--active" : ""}`}
          disabled={pending === "bookmark"}
          onClick={handleBookmark}
        >
          {state.bookmarked ? "Gemerkt" : "Merken"}
        </button>
      )}
      <button
        type="button"
        className={`lcars-usernav-pill${state.subscribed ? " lcars-usernav-pill--active" : ""}`}
        disabled={pending === "subscribe"}
        onClick={handleSubscribe}
      >
        {state.subscribed ? "Abonniert" : "Abonnieren"}
      </button>
    </div>
  );
}

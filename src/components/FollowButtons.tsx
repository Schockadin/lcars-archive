"use client";
import { useEffect, useState } from "react";
import {
  getFollowState,
  toggleBookmark,
  toggleSubscription,
  type FollowState,
} from "@/app/actions/follows";
import type { FollowTargetType } from "@/lib/follows";
import type { ExportContentType } from "@/lib/contentExport";
import { SubscribeIcon, UnsubscribeIcon, BookmarkIcon, UnbookmarkIcon } from "@/lib/icons";
import ShareMenu from "./ShareMenu";

// FollowTargetType kennt zusätzlich "user" (Follow-System, siehe
// lib/follows.ts) — User-Profile bekommen aber bewusst keine Export-Optionen
// (Kontodaten sind kein Kampagnen-Inhalt, siehe ShareMenu-Aufrufstelle
// dort mit showShare={false}); der Typ hier ist deshalb enger als
// FollowTargetType.
const EXPORT_TYPE_BY_TARGET: Partial<Record<FollowTargetType, ExportContentType>> = {
  archive_entry: "archive_entry",
  mission: "mission",
  character: "character",
};

// Bookmark/Abo brauchen eine Session (Rendern erst nach dem Client-Fetch,
// dauerhaft nichts für anonyme Besucher) — Teilen dagegen funktioniert immer
// und wird deshalb unabhängig vom Login-Status gerendert, siehe
// ShareMenu.tsx.
export default function FollowButtons({
  targetType,
  targetSlug,
  subscribeOnly = false,
  showShare = true,
  initialState,
  title = "",
}: {
  targetType: FollowTargetType;
  targetSlug: string;
  subscribeOnly?: boolean;
  showShare?: boolean;
  // Überspringt den eigenen Client-Fetch, wenn der Aufrufer den Stand schon
  // hat (z.B. Inhalts-Detailseiten, die den Stand direkt beim SSR über
  // resolveFollowState in lib/follows.ts auflösen und als Prop mitgeben).
  initialState?: FollowState;
  // Für den WhatsApp-Teilen-Text im ShareMenu — ohne Angabe wird nur die URL
  // geteilt (kein Fehler, nur ein weniger sprechender Text).
  title?: string;
}) {
  const [state, setState] = useState<FollowState | null>(initialState ?? null);
  const [pending, setPending] = useState<"bookmark" | "subscribe" | null>(null);

  useEffect(() => {
    if (initialState) return;
    let cancelled = false;
    getFollowState(targetType, targetSlug).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [targetType, targetSlug, initialState]);

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
      {state?.loggedIn && !subscribeOnly && (
        <button
          type="button"
          className={`lcars-icon-btn size-[40px] ${state.bookmarked ? "bg-lcars-primary text-lcars-bg" : ""}`}
          disabled={pending === "bookmark"}
          onClick={handleBookmark}
          aria-label={state.bookmarked ? "Nicht mehr speichern" : "Speichern"}
          title={state.bookmarked ? "Nicht mehr speichern" : "Speichern"}
        >
          {state.bookmarked ? <UnbookmarkIcon /> : <BookmarkIcon />}
        </button>
      )}
      {state?.loggedIn && (
        <button
          type="button"
          className={`lcars-icon-btn size-[40px] ${state.subscribed ? "bg-lcars-primary text-lcars-bg" : ""}`}
          disabled={pending === "subscribe"}
          onClick={handleSubscribe}
          aria-label={state.subscribed ? "Nicht mehr folgen" : "Folgen"}
          title={state.subscribed ? "Nicht mehr folgen" : "Folgen"}
        >
          {state.subscribed ? <UnsubscribeIcon /> : <SubscribeIcon />}
        </button>
      )}
      {showShare && (
        <ShareMenu
          title={title}
          exportType={EXPORT_TYPE_BY_TARGET[targetType]}
          exportSlug={targetSlug}
        />
      )}
    </div>
  );
}

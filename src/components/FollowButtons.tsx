"use client";
import { useEffect, useRef, useState } from "react";
import {
  getFollowState,
  toggleBookmark,
  toggleSubscription,
  type FollowState,
} from "@/app/actions/follows";
import type { FollowTargetType } from "@/lib/follows";
import {
  SubscribeIcon,
  UnsubscribeIcon,
  BookmarkIcon,
  UnbookmarkIcon,
  ShareIcon,
} from "@/lib/icons";

// Bookmark/Abo brauchen eine Session (Rendern erst nach dem Client-Fetch,
// dauerhaft nichts für anonyme Besucher) — Teilen dagegen funktioniert immer
// und wird deshalb unabhängig vom Login-Status gerendert, siehe
// ShareMenu unten.
export default function FollowButtons({
  targetType,
  targetSlug,
  subscribeOnly = false,
  showShare = true,
  initialState,
}: {
  targetType: FollowTargetType;
  targetSlug: string;
  subscribeOnly?: boolean;
  showShare?: boolean;
  // Überspringt den eigenen Client-Fetch, wenn der Aufrufer den Stand schon
  // hat (z.B. UsersTable.tsx: ein gebündelter Batch-Fetch für alle Zeilen
  // statt eines Fetches pro FollowButtons-Instanz, siehe getFollowStatuses
  // in lib/follows.ts).
  initialState?: FollowState;
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
          className={`lcars-icon-btn size-[40px] ${state.bookmarked ? "bg-lcars-amber text-lcars-bg" : ""}`}
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
          className={`lcars-icon-btn size-[40px] ${state.subscribed ? "bg-lcars-amber text-lcars-bg" : ""}`}
          disabled={pending === "subscribe"}
          onClick={handleSubscribe}
          aria-label={state.subscribed ? "Nicht mehr folgen" : "Folgen"}
          title={state.subscribed ? "Nicht mehr folgen" : "Folgen"}
        >
          {state.subscribed ? <UnsubscribeIcon /> : <SubscribeIcon />}
        </button>
      )}
      {showShare && <ShareMenu />}
    </div>
  );
}

// Eigene Teilen-Schaltfläche mit Dropdown — aktuell nur "Link kopieren",
// aber als Menü statt Einzel-Button angelegt, damit weitere Optionen (z.B.
// native Web-Share-API auf unterstützten Geräten) später ohne Umbau
// dazukommen können.
function ShareMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="follow-share-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="lcars-icon-btn size-[40px]"
        onClick={() => setOpen((v) => !v)}
        aria-label="Teilen"
        title="Teilen"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ShareIcon />
      </button>
      {open && (
        <div className="follow-share-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="follow-share-menu-item"
            onClick={handleCopyLink}
          >
            Link kopieren
          </button>
        </div>
      )}
      {copied && (
        <div className="follow-share-toast" role="status">
          Link kopiert!
        </div>
      )}
    </div>
  );
}

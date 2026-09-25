"use client";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const DASHBOARD_REFRESH_INTERVAL_MS = 10_000;
const NAVIGATION_GUARD_MS = 15_000;

export default function DashboardAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = pathname + "?" + searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const refreshQueued = useRef(false);
  const navigationPending = useRef(false);
  const navigationTimeout = useRef<number | null>(null);

  const refreshWhenIdle = useCallback(() => {
    if (
      document.hidden ||
      isPending ||
      navigationPending.current ||
      refreshQueued.current
    )
      return;
    refreshQueued.current = true;
    startTransition(() => router.refresh());
  }, [isPending, router]);

  useEffect(() => {
    if (!isPending) refreshQueued.current = false;
  }, [isPending]);

  useEffect(() => {
    function markNavigation() {
      navigationPending.current = true;
      if (navigationTimeout.current !== null)
        window.clearTimeout(navigationTimeout.current);
      navigationTimeout.current = window.setTimeout(() => {
        navigationPending.current = false;
        navigationTimeout.current = null;
      }, NAVIGATION_GUARD_MS);
    }
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (
        !link ||
        link.hasAttribute("download") ||
        (link as HTMLAnchorElement).target === "_blank"
      )
        return;
      const destination = new URL(
        (link as HTMLAnchorElement).href,
        window.location.href,
      );
      if (destination.origin !== window.location.origin) return;
      const current = window.location.pathname + window.location.search;
      if (destination.pathname + destination.search !== current)
        markNavigation();
    }
    function handleSubmit(event: Event) {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        form.method.toUpperCase() !== "GET"
      )
        return;
      const destination = new URL(
        form.action || window.location.href,
        window.location.href,
      );
      if (destination.origin === window.location.origin) markNavigation();
    }
    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      if (navigationTimeout.current !== null)
        window.clearTimeout(navigationTimeout.current);
    };
  }, []);

  useEffect(() => {
    navigationPending.current = false;
    if (navigationTimeout.current !== null) {
      window.clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }
  }, [routeKey]);

  useEffect(() => {
    const intervalId = setInterval(
      refreshWhenIdle,
      DASHBOARD_REFRESH_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", refreshWhenIdle);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenIdle);
    };
  }, [refreshWhenIdle]);

  return null;
}

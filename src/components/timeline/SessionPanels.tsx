"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface TimelineDetailResult {
  resource: string;
  html: string | null;
  status: "loading" | "loaded" | "error";
}

export function useTimelineDetail(resource: string | null) {
  const [result, setResult] = useState<TimelineDetailResult | null>(null);
  const resultRef = useRef<TimelineDetailResult | null>(null);
  const controllerRef = useRef<{
    resource: string;
    controller: AbortController;
  } | null>(null);

  const load = useCallback(async (resourceOverride?: string) => {
    const requestedResource = resourceOverride ?? resource;
    const current = resultRef.current;
    if (
      !requestedResource ||
      (current?.resource === requestedResource && current.status === "loaded")
    ) {
      return;
    }
    if (
      current?.resource === requestedResource &&
      current.status === "loading" &&
      controllerRef.current?.resource === requestedResource
    ) {
      return;
    }
    if (controllerRef.current?.resource === requestedResource) return;
    controllerRef.current?.controller.abort();

    const controller = new AbortController();
    controllerRef.current = { resource: requestedResource, controller };
    const loading: TimelineDetailResult = {
      resource: requestedResource,
      html: null,
      status: "loading",
    };
    resultRef.current = loading;
    setResult(loading);
    try {
      const response = await fetch(requestedResource, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Detail konnte nicht geladen werden.");
      const payload = (await response.json()) as { html?: unknown };
      if (typeof payload.html !== "string" && payload.html !== null) {
        throw new Error("Detail konnte nicht geladen werden.");
      }
      const loaded: TimelineDetailResult = {
        resource: requestedResource,
        html: payload.html,
        status: "loaded",
      };
      resultRef.current = loaded;
      setResult(loaded);
    } catch {
      if (controller.signal.aborted) return;
      const failed: TimelineDetailResult = {
        resource: requestedResource,
        html: null,
        status: "error",
      };
      resultRef.current = failed;
      setResult(failed);
    } finally {
      if (controllerRef.current?.controller === controller) {
        controllerRef.current = null;
      }
    }
  }, [resource]);

  useEffect(
    () => () => {
      controllerRef.current?.controller.abort();
      controllerRef.current = null;
    },
    [],
  );

  return {
    html: result?.resource === resource ? result.html : null,
    loaded: result?.resource === resource && result.status === "loaded",
    error: result?.resource === resource && result.status === "error",
    load,
  };
}

export function useSessionPanels(ids: string[]) {
  const [openById, setOpenById] = useState<Record<string, boolean>>({});
  return {
    allOpen: ids.every((id) => openById[id] ?? true),
    isOpen: (id: string) => openById[id] ?? true,
    setOpen: (id: string, open: boolean) => setOpenById((current) => ({ ...current, [id]: open })),
    setAll: (open: boolean) => setOpenById(Object.fromEntries(ids.map((id) => [id, open]))),
  };
}

export function SessionPanelControls({ allOpen, onToggle }: {
  allOpen: boolean;
  onToggle: () => void;
}) {
  const label = allOpen ? "Alle Session-Panels schließen" : "Alle Session-Panels öffnen";
  return (
    <div className="flex shrink-0 items-center gap-[4px] pt-[10px]" role="group" aria-label="Session-Panels">
      <button type="button" className="px-[6px] font-mono text-[18px] text-lcars-primary-ink hover:underline" aria-label={label} title={label} onClick={onToggle}>{allOpen ? "−" : "+"}</button>
    </div>
  );
}

export function SessionSummaryPanel({ blockId, bodyHtml, open, onOpenChange }: {
  blockId?: number;
  bodyHtml?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const resource = blockId ? `/api/timeline-details/session/${blockId}` : null;
  const detail = useTimelineDetail(bodyHtml ? null : resource);
  const loadDetail = detail.load;

  useEffect(() => {
    if (bodyHtml || !resource) return;
    const element = detailsRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      if (open) loadDetail();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && element.open) {
          loadDetail();
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    if (open && element.getBoundingClientRect().top < window.innerHeight + 400) {
      loadDetail();
    }
    return () => observer.disconnect();
  }, [bodyHtml, loadDetail, open, resource]);

  const renderedHtml = bodyHtml ?? detail.html;

  return (
    <details
      ref={detailsRef}
      className="timeline-panel"
      data-session-panel
      open={open}
      onToggle={(event) => {
        if (event.currentTarget.open !== open) {
          onOpenChange(event.currentTarget.open);
          if (event.currentTarget.open) loadDetail();
        }
      }}
    >
      <summary className="timeline-panel-head">Zusammenfassung</summary>
      {renderedHtml !== null && renderedHtml !== "" ? (
        <div
          className="timeline-panel-body mission-body"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : detail.error ? (
        <div className="timeline-panel-body">
          <button
            type="button"
            className="text-lcars-primary-ink underline"
            onClick={() => loadDetail()}
          >
            Zusammenfassung konnte nicht geladen werden. Erneut versuchen
          </button>
        </div>
      ) : detail.loaded ? (
        <div className="timeline-panel-body lcars-eyebrow">
          Keine Zusammenfassung hinterlegt.
        </div>
      ) : (
        <div className="timeline-panel-body lcars-eyebrow" aria-live="polite">
          {resource
            ? "Zusammenfassung wird geladen …"
            : "Keine Zusammenfassung hinterlegt."}
        </div>
      )}
    </details>
  );
}

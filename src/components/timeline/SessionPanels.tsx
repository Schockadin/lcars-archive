"use client";
import { useState } from "react";

export function useSessionPanels(ids: string[]) {
  const [openById, setOpenById] = useState<Record<string, boolean>>({});
  return {
    isOpen: (id: string) => openById[id] ?? true,
    setOpen: (id: string, open: boolean) => setOpenById((current) => ({ ...current, [id]: open })),
    setAll: (open: boolean) => setOpenById(Object.fromEntries(ids.map((id) => [id, open]))),
  };
}

export function SessionPanelControls({ onExpand, onCollapse }: {
  onExpand: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-[4px] pt-[10px]" role="group" aria-label="Session-Panels">
      <button type="button" className="px-[6px] font-mono text-[18px] text-lcars-primary-ink hover:underline" aria-label="Alle Session-Panels öffnen" title="Alle Session-Panels öffnen" onClick={onExpand}>+</button>
      <button type="button" className="px-[6px] font-mono text-[18px] text-lcars-primary-ink hover:underline" aria-label="Alle Session-Panels schließen" title="Alle Session-Panels schließen" onClick={onCollapse}>−</button>
    </div>
  );
}

export function SessionSummaryPanel({ bodyHtml, open, onOpenChange }: {
  bodyHtml: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <details className="timeline-panel" data-session-panel open={open} onToggle={(event) => {
      if (event.currentTarget.open !== open) onOpenChange(event.currentTarget.open);
    }}>
      <summary className="timeline-panel-head">Zusammenfassung</summary>
      <div className="timeline-panel-body mission-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </details>
  );
}

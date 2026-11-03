"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface CharacterEditorTab {
  id: string;
  label: string;
  content: ReactNode;
}

function domId(id: string): string {
  return id.replace(/[^a-z0-9_-]/gi, "-");
}

/** Shared, accessible tab navigation for both character creation and editing. */
export default function CharacterEditorTabs({
  tabs,
  initialTabId,
  activeTabId,
  onActiveTabChange,
}: {
  tabs: CharacterEditorTab[];
  initialTabId?: string;
  activeTabId?: string;
  onActiveTabChange?: (id: string) => void;
}) {
  const [internalActiveId, setInternalActiveId] = useState(
    () => tabs.find((tab) => tab.id === initialTabId)?.id ?? tabs[0]?.id ?? "",
  );
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeId = activeTabId ?? internalActiveId;
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  function activate(id: string) {
    if (activeTabId === undefined) setInternalActiveId(id);
    onActiveTabChange?.(id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentId: string) {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentId);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    activate(next.id);
    refs.current[next.id]?.focus();
  }

  if (!active) return null;

  return (
    <section className="flex flex-col gap-[12px]" aria-label="Charakterbereiche">
      <div
        className="character-editor-tabs-list"
        role="tablist"
        aria-label="Charakter bearbeiten"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          const tabId = `character-editor-tab-${domId(tab.id)}`;
          return (
            <button
              key={tab.id}
              ref={(element) => { refs.current[tab.id] = element; }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`character-editor-panel-${domId(tab.id)}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => activate(tab.id)}
              onKeyDown={(event) => onKeyDown(event, tab.id)}
              className={selected ? "character-editor-tab character-editor-tab--active" : "character-editor-tab"}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const selected = tab.id === active.id;
        return (
          <div
            key={tab.id}
            id={`character-editor-panel-${domId(tab.id)}`}
            role="tabpanel"
            aria-labelledby={`character-editor-tab-${domId(tab.id)}`}
            tabIndex={selected ? 0 : -1}
            hidden={!selected}
          >
            {tab.content}
          </div>
        );
      })}
    </section>
  );
}

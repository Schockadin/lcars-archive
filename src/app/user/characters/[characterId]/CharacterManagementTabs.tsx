"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface Tab {
  id: "values" | "biography" | "modules";
  label: string;
  content: ReactNode;
}

export default function CharacterManagementTabs({
  values,
  biography,
  modules,
}: {
  values: ReactNode;
  biography: ReactNode;
  modules?: ReactNode;
}) {
  const tabs: Tab[] = [
    { id: "values", label: "Charakterwerte", content: values },
    { id: "biography", label: "Biografie", content: biography },
    ...(modules ? [{ id: "modules" as const, label: "Module", content: modules }] : []),
  ];
  const [activeId, setActiveId] = useState<Tab["id"]>("values");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentId: Tab["id"]) {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentId);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    setActiveId(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <section className="flex flex-col gap-[12px]" aria-label="Charakterbereiche">
      <div className="flex flex-wrap gap-[8px] border-b border-current/20 pb-[8px]" role="tablist" aria-label="Charakterbereiche">
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              ref={(element) => { refs.current[tab.id] = element; }}
              id={`character-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`character-tab-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => onKeyDown(event, tab.id)}
              className={`lcars-pill-btn--outline ${selected ? "font-bold" : "opacity-70"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`character-tab-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`character-tab-${tab.id}`}
          tabIndex={tab.id === active.id ? 0 : -1}
          hidden={tab.id !== active.id}
        >
          {tab.content}
        </div>
      ))}
    </section>
  );
}

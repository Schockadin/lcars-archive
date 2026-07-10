"use client";
import { useState, type ReactNode } from "react";

// Aufklappbare Metadaten-Sektion für ContentEditor — Text wechselt zwischen
// "Metadaten +" (zugeklappt) und "Metadaten -" (aufgeklappt). Bleibt im DOM
// (nur per CSS versteckt) statt bedingt gerendert zu werden, damit bereits
// eingegebene Werte beim Zuklappen nicht verloren gehen.
export default function MetadataSection({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-[8px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="lcars-eyebrow self-start cursor-pointer"
      >
        {open ? "Metadaten -" : "Metadaten +"}
      </button>
      <div
        className={open ? "content-editor-head-grid" : "content-editor-head-grid hidden"}
      >
        {children}
      </div>
    </div>
  );
}

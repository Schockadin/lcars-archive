"use client";
import { useEffect, useRef, useState } from "react";

// Bündelt die Admin-Aktionen (Autolinking, Wikilinks entfernen, Text
// formatieren, …) der Inhalts-Detailseiten hinter einem einzigen
// Umschalter, statt sie als wachsende Reihe eigenständiger Buttons zu
// zeigen. Rein generisch — kennt die einzelnen Tools nicht, rendert nur
// deren bestehende Button-Komponenten als children.
export default function AdminActionsMenu({
  label = "Admin-Aktionen",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="admin-actions-menu" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="lcars-switch"
      >
        {label} {open ? "▴" : "▾"}
      </button>
      {open && <div className="admin-actions-menu-panel">{children}</div>}
    </div>
  );
}

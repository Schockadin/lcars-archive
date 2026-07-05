"use client";
import { useLayoutEffect, useEffect, useRef, useState } from "react";

// Bündelt die Admin-Aktionen (Autolinking, Wikilinks entfernen, Text
// formatieren, …) der Inhalts-Detailseiten hinter einem einzigen
// Umschalter, statt sie als wachsende Reihe eigenständiger Buttons zu
// zeigen. Rein generisch — kennt die einzelnen Tools nicht, rendert nur
// deren bestehende Button-Komponenten als children.
//
// Position/Breite werden per JS berechnet (statt fix per CSS), weil der
// Umschalter je nach Seite unterschiedlich weit vom linken Viewport-Rand
// sitzt (Elbow-Leiste) — ein rein CSS-positioniertes Panel mit fester
// Breite lief auf schmalen Displays deshalb rechts aus dem Viewport
// hinaus. Das war dabei nicht sichtbar als abgeschnittener Inhalt zu
// erkennen: html/body nutzen `overflow: clip` (siehe globals.css) statt
// eines Scroll-Containers, wodurch überstehender Inhalt unsichtbar
// verschwindet statt einen Scrollbalken zu erzeugen oder sichtbar
// abgeschnitten zu wirken — nur per Layout-Messung (getBoundingClientRect)
// überhaupt bemerkbar.
export default function AdminActionsMenu({
  label = "Admin-Aktionen",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const margin = 12;
    const width = Math.min(360, window.innerWidth - margin * 2);
    const triggerRect = containerRef.current.getBoundingClientRect();

    let left = triggerRect.left;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - margin - width;
    }
    if (left < margin) left = margin;

    // Analog zu left: nie unterhalb des sichtbaren Bereichs öffnen (der
    // Trigger kann z.B. auf der Charakterseite weit unten sitzen). Ein
    // fixed-positioniertes Panel lässt sich durch Scrollen nicht mehr
    // erreichen, wenn es außerhalb landet — deshalb zusätzlich intern
    // scrollbar (maxHeight), statt auf eine unbekannte Panel-Höhe im
    // Voraus zu vertrauen.
    let top = triggerRect.bottom + 6;
    if (top > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - margin - 200);
    }
    const maxHeight = window.innerHeight - top - margin;

    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight,
      overflowY: "auto",
    });
  }, [open]);

  return (
    <div className="admin-actions-menu" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="lcars-switch"
      >
        {label} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="admin-actions-menu-panel" style={panelStyle}>
          {children}
        </div>
      )}
    </div>
  );
}

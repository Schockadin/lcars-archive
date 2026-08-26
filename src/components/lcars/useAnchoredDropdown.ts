"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";

export interface DropdownAnchor {
  top: number;
  left: number;
  width: number;
}

// Gemeinsame Positionierungs-/Schließen-Logik für ein an ein Trigger-Element
// angedocktes, per createPortal an <body> gehängtes Dropdown (Admin-Menü in
// HeaderUserNav.tsx, Suchergebnisse in HeaderSearch.tsx) — beide brauchen
// einen Portal statt normalem DOM-Nesting, da ein Vorfahr des Headers
// overflow:hidden setzt und das Dropdown sonst abgeschnitten würde. Hält die
// Position aktuell (resize/scroll) und schließt bei Klick außerhalb von
// Trigger+Panel sowie optional bei Escape.
export function useAnchoredDropdown({
  isOpen,
  triggerRef,
  panelRef,
  onClose,
  offset = 4,
  closeOnEscape = true,
  placement = "bottom",
}: {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  offset?: number;
  closeOnEscape?: boolean;
  // "bottom": Panel unter dem Trigger, linksbündig (Default, Header/Suche).
  // "right": Panel rechts neben dem Trigger, oberkantenbündig — für das
  // vertikale Sidebar-Menü im minimalistischen UI (Flyout nach rechts).
  placement?: "bottom" | "right";
}): DropdownAnchor | null {
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (placement === "right") {
      setAnchor({ top: r.top, left: r.right + offset, width: r.width });
    } else {
      setAnchor({ top: r.bottom + offset, left: r.left, width: r.width });
    }
  }, [triggerRef, offset, placement]);

  useEffect(() => {
    if (!isOpen) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isOpen, measure]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);

    if (!closeOnEscape) {
      return () => document.removeEventListener("mousedown", onDown);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        // Fokus per Tastatur zurück auf den Trigger (bei Außenklick bewusst
        // NICHT — dort hat die Person den Fokus absichtlich woanders hin
        // bewegt).
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, triggerRef, panelRef, onClose, closeOnEscape]);

  return anchor;
}

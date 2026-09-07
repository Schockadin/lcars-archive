"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";

// Sicherheitsabstand zum Fensterrand, wenn ein Panel nach oben wächst.
const VIEWPORT_MARGIN = 8;

export interface DropdownAnchor {
  // Genau EINES von top/bottom ist gesetzt (das jeweils andere bleibt
  // undefined und wird von React im style-Objekt ausgelassen): mit top wächst
  // das Panel nach unten, mit bottom nach oben. Beide Werte sind
  // viewport-bezogen — das Panel liegt per position:fixed am <body>.
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  // Nur bei "right-bottom": Höhe auf den Platz OBERHALB der Unterkante
  // begrenzt, damit ein langes Menü nach oben hin nicht aus dem Bild läuft
  // (das Panel scrollt dann intern, siehe overflow-y in header.css).
  maxHeight?: number;
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
  // "right": Panel rechts neben dem Trigger, oberkantenbündig — Flyout nach
  //   rechts, wächst nach unten.
  // "right-bottom": Panel rechts neben dem Trigger, UNTERkantenbündig — es
  //   wächst nach oben. Für die Sidebar im minimalistischen UI: Admin- und
  //   Leitungs-Menü sitzen dort weit unten, ein nach unten wachsendes Flyout
  //   liefe auf niedrigen Fenstern aus dem Bild.
  placement?: "bottom" | "right" | "right-bottom";
}): DropdownAnchor | null {
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (placement === "right") {
      setAnchor({ top: r.top, left: r.right + offset, width: r.width });
    } else if (placement === "right-bottom") {
      // Unterkante des Panels auf Unterkante des Triggers. Über bottom statt
      // top verankert, damit die Höhe des Panels nicht bekannt sein muss —
      // es wächst von der Unterkante aus nach oben.
      setAnchor({
        bottom: window.innerHeight - r.bottom,
        left: r.right + offset,
        width: r.width,
        // Nie über den oberen Fensterrand hinaus: höchstens der Platz über
        // der Unterkante des Triggers (abzüglich eines kleinen Randes) und
        // weiterhin höchstens die 60vh aus dem Stylesheet.
        maxHeight: Math.min(
          window.innerHeight * 0.6,
          r.bottom - VIEWPORT_MARGIN,
        ),
      });
    } else {
      setAnchor({ top: r.bottom + offset, left: r.left, width: r.width });
    }
  }, [triggerRef, offset, placement]);

  useEffect(() => {
    if (!isOpen) return;
    measure();
    // Der scroll-Listener läuft in der Capture-Phase, feuert also für JEDEN
    // scrollbaren Container der Seite (v.a. .lcars-main-content, den
    // Haupt-Scroller). Zwei Vorkehrungen, damit das offene Dropdown das
    // Scrollen nicht ausbremst:
    //   passive: true → der Browser muss nicht erst abwarten, ob der Handler
    //     preventDefault() aufruft, und kann sofort scrollen.
    //   requestAnimationFrame → getBoundingClientRect() (erzwingt Layout) und
    //     das nachfolgende setState laufen höchstens einmal pro Frame statt
    //     einmal pro Scroll-Event.
    let frame = 0;
    const onScrollOrResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    const opts = { passive: true } as const;
    window.addEventListener("resize", onScrollOrResize, opts);
    window.addEventListener("scroll", onScrollOrResize, {
      ...opts,
      capture: true,
    });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
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

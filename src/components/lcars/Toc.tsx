"use client";
import { useEffect, useRef, useState } from "react";

export interface TocHeading {
  id: string;
  text: string;
}

interface LcarsTocProps {
  /** Sprungziele – `id` muss zu einem Element im DOM passen. */
  headings: TocHeading[];
  /** Überschrift des Verzeichnisses. */
  title?: string;
  /** Barrierefreies Label des `<nav>` (Default: `title`). */
  ariaLabel?: string;
  /** Zusätzliche Klassen, z. B. für sticky-Positionierung am Einsatzort. */
  className?: string;
  /**
   * Selektor des Scroll-Containers, der als IntersectionObserver-Root dient.
   * Default ist der App-Hauptbereich; `null` = Viewport.
   */
  scrollRootSelector?: string | null;
}

/**
 * Wiederverwendbares Inhaltsverzeichnis mit Scrollspy.
 * Beobachtet die referenzierten Elemente und hebt die oberste sichtbare
 * Überschrift hervor; Klick scrollt sanft zum Abschnitt.
 */
export default function LcarsToc({
  headings,
  title = "Inhalt",
  ariaLabel,
  className,
  scrollRootSelector = ".lcars-main-content",
}: LcarsTocProps) {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    // Scroll-Container als IntersectionObserver-Root auflösen
    const root = scrollRootSelector
      ? ((navRef.current?.closest(scrollRootSelector) as HTMLElement | null) ??
        null)
      : null;

    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // sichtbare Überschriften samt Position vorhalten → oberste ist aktiv
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            visible.set(e.target.id, e.boundingClientRect.top);
          } else {
            visible.delete(e.target.id);
          }
        }
        if (visible.size > 0) {
          const topId = [...visible.entries()].sort(
            (a, b) => a[1] - b[1],
          )[0][0];
          setActiveId(topId);
        }
      },
      // schmales Band am oberen Rand → aktiv, sobald Überschrift oben ankommt
      { root, rootMargin: "0px 0px -80% 0px", threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, scrollRootSelector]);

  if (headings.length === 0) return null;

  const handleJump = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  return (
    <nav
      ref={navRef}
      className={className ? `lcars-toc ${className}` : "lcars-toc"}
      aria-label={ariaLabel ?? title}
    >
      <p className="lcars-toc-title">{title}</p>
      <ul className="lcars-toc-list">
        {headings.map((h) => (
          <li key={h.id}>
            <div
              className="lcars-toc-link"
              aria-current={activeId === h.id ? "true" : undefined}
              onClick={() => handleJump(h.id)}
            >
              {h.text}
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

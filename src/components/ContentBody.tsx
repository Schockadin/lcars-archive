"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";

// Ersetzt die bisherigen einfachen <div dangerouslySetInnerHTML> für
// Missions-/Log-/Archiv-Eintrag-Texte (MissionSynopsis.tsx,
// MissionSynopsisEditor.tsx, LogDetail.tsx, ArchiveEntryEditor.tsx): Bilder,
// die per InsertImageButton.tsx als `![Bild](...)` in den Markdown-Text
// eingefügt wurden, lassen sich jetzt anklicken und öffnen dieselbe
// Vollbild-Lightbox wie CharacterPortrait.tsx (geteiltes CSS in
// shared.css), mit Karussell über alle Bilder desselben Inhalts statt nur
// des angeklickten einzelnen Bilds.
export default function ContentBody({
  html,
  className = "mission-body lcars-text",
}: {
  html: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  // Nach jedem Render der IMG-Quellen im aktuellen HTML einsammeln — das
  // Karussell darf sich nur über Bilder DIESES Inhalts bewegen, nicht über
  // alle jemals hochgeladenen Bilder.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setImages([]);
      return;
    }
    setImages(Array.from(container.querySelectorAll("img")).map((img) => img.src));
  }, [html]);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  // Escape schließt, Pfeiltasten blättern durchs Karussell; solange offen,
  // Hintergrund-Scroll sperren — gleiches Muster wie CharacterPortrait.tsx.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, close, prev, next]);

  // Klick-Delegation statt eines Handlers pro Bild — der HTML-String kommt
  // aus dangerouslySetInnerHTML, React kennt die einzelnen <img>-Elemente
  // also gar nicht als eigene Komponenten.
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    const src = (target as HTMLImageElement).src;
    const i = images.indexOf(src);
    if (i !== -1) setIndex(i);
  }

  const current = index !== null ? images[index] : null;

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />

      {current &&
        createPortal(
          <div
            className="portrait-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Bild"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              className="portrait-overlay-close"
              aria-label="Schließen"
            >
              ×
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="portrait-overlay-nav portrait-overlay-nav--prev"
                  aria-label="Vorheriges Bild"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="portrait-overlay-nav portrait-overlay-nav--next"
                  aria-label="Nächstes Bild"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}
            {/* Echte Breite/Höhe der eingebetteten Bilder ist unbekannt
                (content_images speichert keine Maße) — width/height dienen
                next/image nur als Seitenverhältnis-Platzhalter, die
                tatsächliche Darstellungsgröße bestimmt weiterhin
                .portrait-overlay-img (width/height:auto, object-fit:contain). */}
            <Image
              key={current}
              src={current}
              alt="Bild"
              width={1200}
              height={1600}
              unoptimized
              className="portrait-overlay-img"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

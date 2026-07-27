"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { getContentImagesAction } from "@/app/actions/contentImages";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/lib/icons";
import { useReturnFocus } from "@/hooks/useReturnFocus";

/**
 * Portrait des Charakters. Ist ein Bild hinterlegt, lässt es sich anklicken und
 * öffnet sich als Vollbild-Overlay (Lightbox): im Original angezeigt, bei zu
 * kleinem Display bildschirmfüllend skaliert. Geschlossen wird per X-Button,
 * Escape-Taste oder Klick außerhalb des Bildes. Enthält zusätzlich alle
 * anderen hochgeladenen Bilder des Charakters (siehe ContentImageGallery in
 * ActionsMenu.tsx) als Karussell, mit Pfeiltasten/Buttons durchblätterbar —
 * das Portrait bleibt dabei bewusst das erste Bild.
 */
export default function CharacterPortrait({
  portrait,
  name,
  characterId,
}: {
  portrait: string | null | undefined;
  name: string;
  characterId: number;
}) {
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  // Fokus nach dem Schließen der Lightbox an das Portrait-Trigger zurückgeben.
  useReturnFocus(open);

  // Karussell-Bilder erst beim Öffnen laden (gleiches Muster wie
  // ContentImageGallery) statt auf jeder Charakterseite unbedingt — Portrait
  // selbst kommt weiterhin direkt aus dem RSC-Prop.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getContentImagesAction("character", characterId).then((images) => {
      if (!cancelled) {
        setGallery(images.map((image) => `/api/content-images/${image.id}`));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, characterId]);

  // Reihenfolge: aktuelles Portrait zuerst (falls gesetzt), danach die
  // übrigen hochgeladenen Bilder ohne Duplikat (falls das Portrait selbst
  // eines der hochgeladenen Bilder ist, siehe setCharacterPortraitAction).
  const slides = portrait
    ? [portrait, ...gallery.filter((src) => src !== portrait)]
    : gallery;
  const current = slides[index] ?? portrait ?? null;

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + slides.length) % slides.length),
    [slides.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % slides.length),
    [slides.length],
  );

  // Escape schließt das Overlay, Pfeiltasten blättern durchs Karussell;
  // solange offen, Hintergrund-Scroll sperren.
  useEffect(() => {
    if (!open) return;
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
  }, [open, close, prev, next]);

  return (
    <div
      className="relative w-full overflow-hidden character-portrait"
      style={{
        aspectRatio: "3 / 4",
        backgroundColor: "var(--lcars-surface)",
      }}
    >
      {portrait ? (
        <>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
            className="group relative block w-full h-full cursor-zoom-in"
            aria-label={`Portrait von ${name} vergrößern`}
          >
            {/* Portraits kommen aus Vault-Frontmatter als freie URL (jeder
                Host denkbar) statt aus einem bekannten, konfigurierbaren
                Bucket — unoptimized statt next.config.ts-remotePatterns,
                da sich kein Host vorab eintragen lässt. */}
            <Image
              src={portrait}
              alt={`Portrait von ${name}`}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-cover object-top"
            />
          </button>

          {open &&
            createPortal(
              <div
                className="portrait-overlay"
                role="dialog"
                aria-modal="true"
                aria-label={`Portrait von ${name}`}
                onClick={close}
              >
                <button
                  type="button"
                  onClick={close}
                  className="portrait-overlay-close"
                  aria-label="Schließen"
                >
                  <XIcon />
                </button>
                {slides.length > 1 && (
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
                {/* Klick auf das Bild selbst soll nicht schließen. Echte
                    Breite/Höhe ist unbekannt (Portrait kommt als freie URL
                    aus dem Vault-Frontmatter, die übrigen Karussell-Bilder
                    über den content-images-Proxy) — width/height dienen
                    next/image nur als Seitenverhältnis-Vorgabe, die
                    tatsächliche Darstellungsgröße bestimmt weiterhin die
                    CSS-Klasse (width/height:auto, object-fit:contain, siehe
                    character.css). */}
                {current && (
                  <Image
                    key={current}
                    src={current}
                    alt={`Bild von ${name}`}
                    width={1200}
                    height={1600}
                    unoptimized
                    className="portrait-overlay-img"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>,
              document.body,
            )}
        </>
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2"
          style={{ color: "var(--lcars-text-dim)" }}
        >
          <svg
            width="56"
            height="68"
            viewBox="0 0 56 68"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="28" cy="20" r="16" fill="currentColor" opacity="0.3" />
            <path
              d="M0 68 C0 44 56 44 56 68Z"
              fill="currentColor"
              opacity="0.3"
            />
          </svg>
          <span className="text-[10px] uppercase tracking-[.3em] opacity-50">
            Kein Bild
          </span>
        </div>
      )}
    </div>
  );
}

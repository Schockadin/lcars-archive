"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

/**
 * Portrait des Charakters. Ist ein Bild hinterlegt, lässt es sich anklicken und
 * öffnet sich als Vollbild-Overlay (Lightbox): im Original angezeigt, bei zu
 * kleinem Display bildschirmfüllend skaliert. Geschlossen wird per X-Button,
 * Escape-Taste oder Klick außerhalb des Bildes.
 */
export default function CharacterPortrait({
  portrait,
  name,
}: {
  portrait: string | null | undefined;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Escape schließt das Overlay; solange offen, Hintergrund-Scroll sperren.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

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
            onClick={() => setOpen(true)}
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
                  ×
                </button>
                {/* Klick auf das Bild selbst soll nicht schließen. Echte
                    Breite/Höhe des Portraits ist unbekannt (freie URL) —
                    width/height dienen next/image nur als Seitenverhältnis-
                    Vorgabe, die tatsächliche Darstellungsgröße bestimmt
                    weiterhin die CSS-Klasse (width/height:auto,
                    object-fit:contain, siehe character.css). */}
                <Image
                  src={portrait}
                  alt={`Portrait von ${name}`}
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

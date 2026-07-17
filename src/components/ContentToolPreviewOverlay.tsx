"use client";
import { createPortal } from "react-dom";

// Gemeinsames Overlay für AutolinkButton.tsx/RemoveWikilinksButton.tsx —
// gleiches Muster wie TimelineMarkerButton.tsx (.timeline-marker-overlay):
// als Portal auf document.body gerendert, Klick auf den Hintergrund
// entspricht Abbrechen. Vorher lag die Vorschau inline im schmalen
// Actions-Menü-Flex (Breite/Position per CSS-Hack erzwungen) — das war auf
// schmalen Bildschirmen kaum lesbar und quetschte sich neben den
// Geschwister-Button. Als zentriertes, breitengekapptes Modal ist die
// Vorschau unabhängig von der Seitenbreite immer gut lesbar.
export default function ContentToolPreviewOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      className="content-tool-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="content-tool-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

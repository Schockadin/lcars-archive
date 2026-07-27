"use client";
import { useEffect, useRef, useState } from "react";
import { ShareIcon } from "@/lib/icons";
import { useToast } from "@/components/toast/ToastProvider";
import type { ExportContentType } from "@/lib/contentExport";

// Eigene Teilen-Schaltfläche mit Dropdown — ursprünglich Teil von
// FollowButtons.tsx, hierher ausgelagert, damit sie auch dort nutzbar ist,
// wo Bookmark/Abo nicht existieren (z.B. Missionslogs, die kein
// FollowTargetType kennen, siehe lib/follows.ts). "title" wird für den
// WhatsApp-Teilen-Text gebraucht; exportType/exportSlug sind optional —
// ohne sie (z.B. User-Profile) fehlen die Export-Einträge einfach, das
// Menü bleibt aber nutzbar (Link kopieren/WhatsApp funktionieren immer,
// solange eine URL existiert).
export default function ShareMenu({
  title,
  exportType,
  exportSlug,
}: {
  title: string;
  exportType?: ExportContentType;
  exportSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link kopiert!", { kind: "success" });
    } catch {
      showToast("Link konnte nicht kopiert werden.", { kind: "error" });
    }
    setOpen(false);
  }

  // window.location.href nur hier (im Click-Handler) gelesen, nie beim
  // Rendern — sonst würde die Server-seitige erste Renderpassage einer
  // Client-Komponente crashen (kein window dort).
  function handleShareWhatsApp() {
    const text = `${title} ${window.location.href}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }

  // Reiner Download-Link (Content-Disposition: attachment auf der Route,
  // siehe src/app/api/export/*/route.ts) — kein Blob/base64-Umweg nötig,
  // der Browser übernimmt den Download direkt.
  function handleExport(format: "markdown" | "pdf") {
    if (!exportType || !exportSlug) return;
    window.location.href = `/api/export/${format}?type=${encodeURIComponent(exportType)}&slug=${encodeURIComponent(exportSlug)}`;
    setOpen(false);
  }

  return (
    <div className="follow-share-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="lcars-icon-btn size-[40px]"
        onClick={() => setOpen((v) => !v)}
        aria-label="Teilen"
        title="Teilen"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ShareIcon />
      </button>
      {open && (
        <div className="follow-share-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="follow-share-menu-item"
            onClick={handleCopyLink}
          >
            Link kopieren
          </button>
          <button
            type="button"
            role="menuitem"
            className="follow-share-menu-item"
            onClick={handleShareWhatsApp}
          >
            WhatsApp
          </button>
          {exportType && exportSlug && (
            <>
              <button
                type="button"
                role="menuitem"
                className="follow-share-menu-item"
                onClick={() => handleExport("markdown")}
              >
                Als Markdown exportieren
              </button>
              <button
                type="button"
                role="menuitem"
                className="follow-share-menu-item"
                onClick={() => handleExport("pdf")}
              >
                Als PDF exportieren
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

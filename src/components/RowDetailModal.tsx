"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CopyIcon, CheckIcon, XIcon } from "@/lib/icons";

export interface RowDetailField {
  label: string;
  value: string;
}

// Geteiltes Zeilendetails-Modal für alle Admin-Tabellen (DbTableRows.tsx,
// AdminLogTable.tsx) — ein Klick auf eine Zeile öffnet die vollständigen,
// ungekürzten Werte aller Spalten dieser Zeile statt der auf eine Vorschau
// gekürzten Tabellenzelle. Gleiches Overlay-Muster (createPortal, Escape
// schließt, Klick außerhalb schließt, Scroll-Sperre während offen) wie
// CharacterPortrait.tsx.
export default function RowDetailModal({
  title,
  fields,
  onClose,
}: {
  title: string;
  fields: RowDetailField[];
  onClose: () => void;
}) {
  const close = useCallback(() => onClose(), [onClose]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
  }, [close]);

  // Kopiert alle Felder als "Label: Wert", durch eine Leerzeile getrennt —
  // dieselbe Reihenfolge wie im Modal angezeigt.
  async function handleCopy() {
    const text = fields.map((f) => `${f.label}: ${f.value}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={close}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[720px] flex-col gap-[16px] overflow-y-auto rounded-[8px] border border-lcars-border bg-lcars-surface p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-amber">{title}</h2>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={handleCopy}
              className="lcars-icon-btn"
              aria-label={copied ? "Kopiert!" : "Gesamten Inhalt kopieren"}
              title={copied ? "Kopiert!" : "Gesamten Inhalt kopieren"}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              type="button"
              onClick={close}
              className="lcars-icon-btn"
              aria-label="Schließen"
            >
              <XIcon />
            </button>
          </div>
        </div>
        <dl className="flex flex-col gap-[12px]">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="lcars-eyebrow">{f.label}</dt>
              <dd className="text-lcars-text text-[13px] whitespace-pre-wrap break-words">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>,
    document.body,
  );
}

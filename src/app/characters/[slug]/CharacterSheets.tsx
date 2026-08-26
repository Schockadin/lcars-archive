"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  getCharacterSheetsAction,
  uploadCharacterSheetsAction,
  deleteCharacterSheetAction,
} from "@/app/actions/characterSheets";
import type { CharacterSheet } from "@/lib/characterSheets";
import { DownloadIcon, UploadIcon, TrashIcon, EyeIcon, XIcon } from "@/lib/icons";

// Vollbild-Modal mit eingebettetem PDF (Proxy-Route, inline). <iframe> statt
// <object>/<embed> (CSP object-src 'none'; frame-ancestors 'self' erlaubt das
// same-origin-Framing, siehe next.config.ts). Escape/Klick außerhalb schließt,
// Body-Scroll wird gesperrt — gleiches Overlay-Muster wie RowDetailModal.
function PdfModal({
  sheet,
  onClose,
}: {
  sheet: CharacterSheet;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Charakterbogen: ${sheet.fileName}`}
      onClick={onClose}
      className="fixed inset-0 flex flex-col gap-[8px] bg-black/80 p-[12px] sm:p-[20px]"
      style={{ zIndex: 1000 }}
    >
      <div
        className="flex items-center gap-[8px]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="lcars-text-data flex-1 min-w-0 truncate" title={sheet.fileName}>
          {sheet.fileName}
        </span>
        <a
          href={`${sheet.url}?download=1`}
          download={sheet.fileName}
          className="lcars-icon-btn size-[32px]"
          aria-label="Herunterladen"
          title="Herunterladen"
        >
          <DownloadIcon />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="lcars-icon-btn size-[32px]"
          aria-label="Schließen"
          title="Schließen (Esc)"
        >
          <XIcon />
        </button>
      </div>
      <iframe
        src={sheet.url}
        title={`Vorschau: ${sheet.fileName}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 w-full rounded-lcars bg-white"
      />
    </div>,
    document.body,
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Charakterbögen (PDFs) auf der Charakterseite. Sichtbar für jede:n, die/der den
// Charakter sehen darf (die Liste wird serverseitig nach der Charakter-
// Sichtbarkeit gefiltert, siehe getCharacterSheetsAction); Hochladen/Löschen
// nur für den Owner (canManage). Die Bögen liegen im öffentlichen Asset-Bucket
// und werden per direkter URL heruntergeladen. Lädt die Liste beim Mounten
// (gleiches Muster wie ContentImageGallery) statt als RSC-Prop.
export default function CharacterSheets({
  characterId,
  canManage,
}: {
  characterId: number;
  canManage: boolean;
}) {
  const [sheets, setSheets] = useState<CharacterSheet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Welcher Bogen ist gerade im eingebetteten Viewer geöffnet (null = keiner).
  const [openId, setOpenId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getCharacterSheetsAction(characterId).then((result) => {
      if (!cancelled) setSheets(result);
    });
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.set("characterId", String(characterId));
    for (const file of files) formData.append("files", file);

    startTransition(async () => {
      const result = await uploadCharacterSheetsAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setSheets(result.sheets ?? []);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(sheetId: number) {
    startTransition(async () => {
      const result = await deleteCharacterSheetAction(characterId, sheetId);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setSheets(result.sheets ?? []);
      }
    });
  }

  // Für Nicht-Owner ohne Bögen die Sektion ganz ausblenden (kein leerer Block).
  const hasSheets = sheets != null && sheets.length > 0;
  const openSheet = sheets?.find((s) => s.id === openId) ?? null;
  if (!canManage && (sheets == null || !hasSheets)) return null;

  return (
    <div className="char-file-sheets">
      <p className="lcars-eyebrow">Charakterbögen</p>

      {sheets == null && <p className="text-[13px]">Lädt…</p>}

      {sheets != null && sheets.length === 0 && (
        <p className="text-[13px] text-lcars-ink-dim">
          Noch keine Bögen hinterlegt.
        </p>
      )}

      {hasSheets && (
        <ul className="char-file-sheets-list">
          {sheets!.map((sheet) => (
            <li key={sheet.id} className="char-file-sheets-item">
              {/* Name/Größe öffnet die PDF-Vorschau im Modal. */}
              <button
                type="button"
                onClick={() => setOpenId(sheet.id)}
                className="char-file-sheets-link cursor-pointer bg-transparent border-0 text-left"
                title="Vorschau anzeigen"
              >
                <EyeIcon />
                <span className="char-file-sheets-name">{sheet.fileName}</span>
                <span className="char-file-sheets-size">
                  {formatSize(sheet.sizeBytes)}
                </span>
              </button>
              {/* Getrennter Download (Content-Disposition attachment). */}
              <a
                href={`${sheet.url}?download=1`}
                download={sheet.fileName}
                className="lcars-icon-btn size-[28px]"
                aria-label={`Bogen „${sheet.fileName}“ herunterladen`}
                title="Herunterladen"
              >
                <DownloadIcon />
              </a>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(sheet.id)}
                  disabled={pending}
                  className="lcars-icon-btn lcars-icon-btn--danger size-[28px] disabled:opacity-50"
                  aria-label={`Bogen „${sheet.fileName}“ löschen`}
                  title="Bogen löschen"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-col gap-[6px] items-start">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            disabled={pending}
            className="hidden"
            id={`character-sheet-upload-${characterId}`}
          />
          <label
            htmlFor={`character-sheet-upload-${characterId}`}
            className="lcars-pill-btn--outline flex items-center gap-[6px] cursor-pointer"
          >
            <UploadIcon />
            {pending ? "Wird hochgeladen…" : "PDF hochladen"}
          </label>
          <p className="text-[12px] text-lcars-ink-dim">
            Nur PDF, bis 20 MB pro Datei.
          </p>
        </div>
      )}

      {error && (
        <p className="text-lcars-quinary text-[13px]" role="alert">
          {error}
        </p>
      )}

      {openSheet && (
        <PdfModal sheet={openSheet} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

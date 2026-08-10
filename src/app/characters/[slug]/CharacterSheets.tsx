"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  getCharacterSheetsAction,
  uploadCharacterSheetsAction,
  deleteCharacterSheetAction,
} from "@/app/actions/characterSheets";
import type { CharacterSheet } from "@/lib/characterSheets";
import { DownloadIcon, UploadIcon, TrashIcon, EyeIcon } from "@/lib/icons";

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
  if (!canManage && (sheets == null || !hasSheets)) return null;

  return (
    <div className="char-file-sheets">
      <p className="lcars-eyebrow">Charakterbögen</p>

      {sheets == null && <p className="text-[13px]">Lädt…</p>}

      {sheets != null && sheets.length === 0 && (
        <p className="text-[13px] text-lcars-text-dim">
          Noch keine Bögen hinterlegt.
        </p>
      )}

      {hasSheets && (
        <ul className="char-file-sheets-list">
          {sheets!.map((sheet) => {
            const isOpen = openId === sheet.id;
            return (
              <li key={sheet.id} className="flex flex-col gap-[6px]">
                <div className="char-file-sheets-item">
                  {/* Name/Größe schaltet den eingebetteten Viewer um. */}
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : sheet.id)}
                    className="char-file-sheets-link cursor-pointer bg-transparent border-0 text-left"
                    aria-expanded={isOpen}
                    title={isOpen ? "Vorschau schließen" : "Vorschau anzeigen"}
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
                </div>

                {isOpen && (
                  // Eingebetteter PDF-Viewer über die Proxy-Route (inline).
                  // <iframe> statt <object>/<embed>, da die CSP object-src
                  // 'none' setzt, frame-src aber 'self' erlaubt.
                  <iframe
                    src={sheet.url}
                    title={`Vorschau: ${sheet.fileName}`}
                    className="w-full rounded-lcars border border-lcars-border"
                    style={{ height: "70vh", minHeight: 360 }}
                  />
                )}
              </li>
            );
          })}
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
          <p className="text-[12px] text-lcars-text-dim">
            Nur PDF, bis 20 MB pro Datei.
          </p>
        </div>
      )}

      {error && (
        <p className="text-lcars-red text-[13px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

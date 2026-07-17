"use client";
import { useRef, useState } from "react";
import {
  previewMarkdownImportAction,
  confirmMarkdownImportAction,
  type ImportContentType,
  type ImportPreviewResult,
} from "./actions";

const CONTENT_TYPE_LABELS: Record<ImportContentType, string> = {
  archive: "Archiv-Eintrag",
  mission: "Mission",
  character: "Charakter",
};

type RowStatus = "ready" | "importing" | "imported" | "discarded" | "error";

interface Row {
  filename: string;
  content: string;
  preview: ImportPreviewResult;
  status: RowStatus;
  resultSlug?: string;
  resultError?: string;
}

// Admin-only (siehe page.tsx) — Upload einzelner oder mehrerer .md-Dateien im
// selben Frontmatter-Format wie das CLI-Ingest (scripts/ingest/*.ts). Jede
// Datei wird zuerst nur geparst und angezeigt (previewMarkdownImportAction,
// kein DB-Schreibzugriff) und muss einzeln bestätigt werden
// (confirmMarkdownImportAction) — kein Batch-"alle übernehmen".
export default function MarkdownImportPanel() {
  const [contentType, setContentType] = useState<ImportContentType>("archive");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setLoadError(null);
    setLoadingPreview(true);
    try {
      const entries = await Promise.all(
        Array.from(files).map(async (file) => ({
          filename: file.name,
          content: await file.text(),
        })),
      );
      const previews = await previewMarkdownImportAction(contentType, entries);
      setRows(
        entries.map((entry, i) => ({
          filename: entry.filename,
          content: entry.content,
          preview: previews[i],
          status: "ready" as const,
        })),
      );
    } catch {
      setLoadError("Dateien konnten nicht gelesen/geparst werden.");
    } finally {
      setLoadingPreview(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm(filename: string) {
    setRows((prev) =>
      prev.map((r) => (r.filename === filename ? { ...r, status: "importing" } : r)),
    );
    const row = rows.find((r) => r.filename === filename);
    if (!row) return;

    const result = await confirmMarkdownImportAction(contentType, row.filename, row.content);
    setRows((prev) =>
      prev.map((r) =>
        r.filename === filename
          ? result.ok
            ? { ...r, status: "imported", resultSlug: result.slug }
            : { ...r, status: "error", resultError: result.error }
          : r,
      ),
    );
  }

  function handleDiscard(filename: string) {
    setRows((prev) =>
      prev.map((r) => (r.filename === filename ? { ...r, status: "discarded" } : r)),
    );
  }

  return (
    <div className="lcars-text flex flex-col gap-[16px]">
      <p className="text-lcars-text-dim text-[13px]">
        Lädt eine oder mehrere Markdown-Dateien im Vault-Frontmatter-Format
        (wie beim CLI-Ingest) hoch. Jede Datei wird zunächst nur geparst und
        als Vorschau angezeigt — erst nach individueller Bestätigung wird
        tatsächlich ein neuer Eintrag angelegt. Bereits vergebene Slugs werden
        abgelehnt, es wird nichts überschrieben. Querverweise (related_*,
        Teilnehmer, Dialog-Schauplatz) werden nur gegen bereits vorhandene
        Einträge aufgelöst — referenzierte Dateien vorher hochladen und
        bestätigen, falls nötig.
      </p>

      <div className="flex flex-wrap items-center gap-[12px]">
        <select
          value={contentType}
          onChange={(e) => {
            setContentType(e.target.value as ImportContentType);
            setRows([]);
          }}
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        >
          {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="lcars-pill-btn--outline self-start cursor-pointer disabled:opacity-50">
          {loadingPreview ? "Wird geladen…" : "Dateien auswählen"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            disabled={loadingPreview}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleFiles(files);
            }}
          />
        </label>
      </div>

      {loadError && (
        <p className="text-lcars-red" role="alert">
          {loadError}
        </p>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-[16px]">
          {rows.map((row) => (
            <ImportRowCard
              key={row.filename}
              row={row}
              onConfirm={() => handleConfirm(row.filename)}
              onDiscard={() => handleDiscard(row.filename)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImportRowCard({
  row,
  onConfirm,
  onDiscard,
}: {
  row: Row;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const { preview } = row;

  return (
    <div className="rounded-lcars border border-lcars-border p-[16px] flex flex-col gap-[8px]">
      <p className="lcars-eyebrow">{row.filename}</p>

      {!preview.ok ? (
        <p className="text-lcars-red">{preview.error}</p>
      ) : (
        <>
          <ImportPreviewSummary preview={preview} />

          {preview.warnings.length > 0 && (
            <ul className="text-lcars-amber text-[13px] list-disc pl-[20px]">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div
            className="mission-body lcars-text text-[14px] max-h-[200px] overflow-y-auto rounded-lcars border border-lcars-border p-[10px]"
            dangerouslySetInnerHTML={{
              __html:
                preview.kind === "archive"
                  ? preview.contentHtml
                  : preview.kind === "mission"
                    ? preview.bodyHtml
                    : preview.bio,
            }}
          />
        </>
      )}

      {row.status === "ready" && preview.ok && (
        <div className="flex gap-[8px] mt-[4px]">
          <button
            type="button"
            onClick={onConfirm}
            disabled={preview.slugTaken}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
          >
            Übernehmen
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="lcars-pill-btn--outline self-start"
          >
            Verwerfen
          </button>
        </div>
      )}
      {row.status === "importing" && <p className="text-lcars-text-dim">Wird angelegt…</p>}
      {row.status === "imported" && (
        <p className="text-lcars-amber">Angelegt als „{row.resultSlug}“.</p>
      )}
      {row.status === "error" && <p className="text-lcars-red">{row.resultError}</p>}
      {row.status === "discarded" && (
        <p className="text-lcars-text-dim">Verworfen, nicht angelegt.</p>
      )}
    </div>
  );
}

function ImportPreviewSummary({
  preview,
}: {
  preview: Exclude<ImportPreviewResult, { ok: false }>;
}) {
  if (preview.kind === "archive") {
    return (
      <div className="char-file-data">
        <div className="char-file-field">
          <span className="char-file-field-label">Titel:</span>{" "}
          <span className="char-file-field-value">{preview.title}</span>
        </div>
        <div className="char-file-field">
          <span className="char-file-field-label">Kategorie:</span>{" "}
          <span className="char-file-field-value">{preview.category}</span>
        </div>
        <div className="char-file-field">
          <span className="char-file-field-label">Slug:</span>{" "}
          <span className="char-file-field-value">
            {preview.slug}
            {preview.slugTaken && " (bereits vergeben)"}
          </span>
        </div>
        {preview.tags.length > 0 && (
          <div className="char-file-field">
            <span className="char-file-field-label">Tags:</span>{" "}
            <span className="char-file-field-value">{preview.tags.join(", ")}</span>
          </div>
        )}
      </div>
    );
  }
  if (preview.kind === "mission") {
    return (
      <div className="char-file-data">
        <div className="char-file-field">
          <span className="char-file-field-label">Titel:</span>{" "}
          <span className="char-file-field-value">{preview.title}</span>
        </div>
        <div className="char-file-field">
          <span className="char-file-field-label">Status:</span>{" "}
          <span className="char-file-field-value">{preview.status}</span>
        </div>
        <div className="char-file-field">
          <span className="char-file-field-label">Slug:</span>{" "}
          <span className="char-file-field-value">
            {preview.slug}
            {preview.slugTaken && " (bereits vergeben)"}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="char-file-data">
      <div className="char-file-field">
        <span className="char-file-field-label">Name:</span>{" "}
        <span className="char-file-field-value">{preview.name}</span>
      </div>
      <div className="char-file-field">
        <span className="char-file-field-label">Status:</span>{" "}
        <span className="char-file-field-value">{preview.status}</span>
      </div>
      <div className="char-file-field">
        <span className="char-file-field-label">Slug:</span>{" "}
        <span className="char-file-field-value">
          {preview.slug}
          {preview.slugTaken && " (bereits vergeben)"}
        </span>
      </div>
    </div>
  );
}

"use client";
import { useMemo } from "react";
import {
  previewWikilinkCleanupAction,
  applyWikilinkCleanupAction,
  type ContentToolType,
} from "@/app/actions/contentTools";
import { UnlinkIcon } from "@/lib/icons";
import { usePreviewConfirmAction } from "@/hooks/usePreviewConfirmAction";

// Admin-only Action auf den vier Inhalts-Detailseiten (Mission, Log,
// Archiv-Eintrag, Charakter): entfernt alle [[Ziel]]/[[Ziel|Text]]-
// Wikilinks aus dem Markdown-Quelltext (siehe src/lib/wikilinkCleanup.ts)
// und ersetzt sie durch reinen Anzeigetext. Sinnvoll als Aufräum-Schritt
// nach dem neuen Autolinking-Feature: dessen echte, sofort aufgelöste
// Links machen die alte, nur beim Vault-Ingest aufgelöste [[...]]-Syntax
// überflüssig. Gleiches Vorschau-vor-Speichern-Muster wie AutolinkButton.
export default function RemoveWikilinksButton({
  contentType,
  slug,
}: {
  contentType: ContentToolType;
  slug: string;
}) {
  const { preview, error, applied, pending, handlePreview, handleConfirm, handleCancel } =
    usePreviewConfirmAction(
      contentType,
      slug,
      previewWikilinkCleanupAction,
      applyWikilinkCleanupAction,
      (result) =>
        `${result.removedCount} Wikilink${result.removedCount === 1 ? "" : "s"} entfernt.`,
    );

  const distinctRemoved = useMemo(
    () =>
      preview
        ? Object.values(
            preview.removed.reduce<
              Record<string, { original: string; replacement: string; count: number }>
            >((acc, entry) => {
              if (!acc[entry.original]) {
                acc[entry.original] = {
                  original: entry.original,
                  replacement: entry.replacement,
                  count: 0,
                };
              }
              acc[entry.original].count++;
              return acc;
            }, {}),
          )
        : [],
    [preview],
  );

  if (preview) {
    return (
      <div className="autolink-preview">
        <p className="lcars-eyebrow">
          {preview.removed.length === 0
            ? "Keine Wikilinks gefunden."
            : `${preview.removed.length} Wikilink${preview.removed.length === 1 ? "" : "s"} gefunden:`}
        </p>

        {distinctRemoved.length > 0 && (
          <ul className="autolink-match-list">
            {distinctRemoved.map((r, i) => (
              <li key={i}>
                „{r.original}“ → „{r.replacement}“ ({r.count} mal)
              </li>
            ))}
          </ul>
        )}

        {preview.removed.length > 0 && (
          <div
            className="mission-body lcars-text autolink-preview-html"
            dangerouslySetInnerHTML={{ __html: preview.previewHtml }}
          />
        )}

        <div className="flex gap-[12px] items-center justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="lcars-pill-btn--outline"
          >
            Abbrechen
          </button>
          {preview.removed.length > 0 && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="lcars-pill-btn--outline disabled:opacity-50"
            >
              {pending ? "Speichern…" : "Übernehmen"}
            </button>
          )}
        </div>

        {error && (
          <p className="text-lcars-red text-[13px]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[6px] items-start w-[85%]">
      <button
        type="button"
        onClick={handlePreview}
        disabled={pending}
        className="lcars-icon-btn size-[40px] disabled:opacity-50 border-lcars-red"
        aria-label="Verlinkung entfernen"
        title="Verlinkung entfernen"
      >
        <UnlinkIcon />
      </button>
      {applied && (
        <p className="text-lcars-green text-[13px]" role="status">
          {applied}
        </p>
      )}
      {error && (
        <p className="text-lcars-red text-[13px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

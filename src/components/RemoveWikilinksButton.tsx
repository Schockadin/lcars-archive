"use client";
import { useMemo } from "react";
import {
  previewWikilinkCleanupAction,
  applyWikilinkCleanupAction,
  type ContentToolType,
} from "@/app/actions/contentTools";
import { UnlinkIcon } from "@/lib/icons";
import { usePreviewConfirmAction } from "@/hooks/usePreviewConfirmAction";
import { groupByCount } from "@/lib/groupByCount";
import PreviewConfirmFooter from "./PreviewConfirmFooter";
import ContentToolPreviewOverlay from "./ContentToolPreviewOverlay";

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
        ? groupByCount(
            preview.removed,
            (entry) => entry.original,
            (entry) => ({
              original: entry.original,
              replacement: entry.replacement,
            }),
          )
        : [],
    [preview],
  );

  if (preview) {
    return (
      <ContentToolPreviewOverlay
        title="Verlinkung entfernen — Vorschau"
        onClose={handleCancel}
      >
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

        <PreviewConfirmFooter
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          pending={pending}
          canConfirm={preview.removed.length > 0}
        />

        {error && (
          <p className="text-lcars-red text-[13px]" role="alert">
            {error}
          </p>
        )}
      </ContentToolPreviewOverlay>
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

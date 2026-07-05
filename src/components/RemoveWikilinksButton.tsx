"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewWikilinkCleanupAction,
  applyWikilinkCleanupAction,
  type ContentToolType,
  type WikilinkCleanupPreviewResult,
} from "@/app/actions/contentTools";

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
  const router = useRouter();
  const [preview, setPreview] = useState<WikilinkCleanupPreviewResult | null>(
    null,
  );
  const [error, setError] = useState<string | undefined>();
  const [applied, setApplied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePreview() {
    setError(undefined);
    setApplied(null);
    startTransition(async () => {
      const result = await previewWikilinkCleanupAction(contentType, slug);
      if ("error" in result) setError(result.error);
      else setPreview(result);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await applyWikilinkCleanupAction(contentType, slug);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPreview(null);
      setApplied(
        `${result.removedCount} Wikilink${result.removedCount === 1 ? "" : "s"} entfernt.`,
      );
      router.refresh();
    });
  }

  function handleCancel() {
    setPreview(null);
  }

  if (preview) {
    return (
      <div className="autolink-preview">
        <p className="lcars-eyebrow">
          {preview.removed.length === 0
            ? "Keine Wikilinks gefunden."
            : `${preview.removed.length} Wikilink${preview.removed.length === 1 ? "" : "s"} gefunden:`}
        </p>

        {preview.removed.length > 0 && (
          <ul className="autolink-match-list">
            {preview.removed.map((r, i) => (
              <li key={i}>
                „{r.original}“ → „{r.replacement}“
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
            className="lcars-switch"
          >
            Abbrechen
          </button>
          {preview.removed.length > 0 && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="lcars-switch disabled:opacity-50"
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
    <div className="flex flex-col gap-[6px] items-start">
      <button
        type="button"
        onClick={handlePreview}
        disabled={pending}
        className="lcars-switch disabled:opacity-50"
      >
        {pending ? "Prüfe…" : "Wikilinks entfernen"}
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

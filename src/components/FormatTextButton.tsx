"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewTextFormatAction,
  applyTextFormatAction,
  type ContentToolType,
  type TextFormatPreviewResult,
} from "@/app/actions/contentTools";

// Admin-only Action auf den vier Inhalts-Detailseiten (Mission, Log,
// Archiv-Eintrag, Charakter): vereinheitlicht die Typografie des Markdown-
// Quelltexts (gerade Apostrophe → typografischer Apostroph, gerade
// Anführungszeichen → deutsche „Anführungszeichen") — siehe
// src/lib/textFormat.ts. Gleiches Vorschau-vor-Speichern-Muster wie
// AutolinkButton/RemoveWikilinksButton.
export default function FormatTextButton({
  contentType,
  slug,
}: {
  contentType: ContentToolType;
  slug: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<TextFormatPreviewResult | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [applied, setApplied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePreview() {
    setError(undefined);
    setApplied(null);
    startTransition(async () => {
      const result = await previewTextFormatAction(contentType, slug);
      if ("error" in result) setError(result.error);
      else setPreview(result);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await applyTextFormatAction(contentType, slug);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPreview(null);
      setApplied(
        `${result.apostropheCount} Apostroph${result.apostropheCount === 1 ? "" : "e"}, ${result.quoteCount} Anführungszeichen angepasst.`,
      );
      router.refresh();
    });
  }

  function handleCancel() {
    setPreview(null);
  }

  if (preview) {
    const hasChanges = preview.apostropheCount > 0 || preview.quoteCount > 0;
    return (
      <div className="autolink-preview">
        <p className="lcars-eyebrow">
          {hasChanges
            ? `${preview.apostropheCount} Apostroph${preview.apostropheCount === 1 ? "" : "e"}, ${preview.quoteCount} Anführungszeichen gefunden:`
            : "Keine Anführungszeichen oder Apostrophe gefunden."}
        </p>

        {hasChanges && (
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
          {hasChanges && (
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
    <div className="flex flex-col gap-[6px] items-start w-[85%]">
      <button
        type="button"
        onClick={handlePreview}
        disabled={pending}
        className="lcars-switch disabled:opacity-50 w-full"
      >
        {pending ? "Prüfe…" : "Text formatieren"}
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

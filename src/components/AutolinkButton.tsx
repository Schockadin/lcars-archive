"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewAutolinkAction,
  applyAutolinkAction,
  type ContentToolType,
  type AutolinkPreviewResult,
} from "@/app/actions/contentTools";

const TYPE_LABEL: Record<
  AutolinkPreviewResult["matches"][number]["type"],
  string
> = {
  character: "Charakter",
  mission: "Mission",
  archive: "Archiv",
};

// Admin-only Action auf den vier Inhalts-Detailseiten (Mission, Log,
// Archiv-Eintrag, Charakter): durchsucht den Markdown-Quelltext nach
// Erwähnungen bekannter Namen/Aliase und verlinkt sie automatisch (siehe
// src/lib/autolink.ts). Erst Vorschau (Trefferliste + gerenderte Vorschau),
// dann explizites Bestätigen — kein Blind-Apply, falls ein Treffer ein
// Fehlgriff ist (z.B. ein Wort, das zufällig einem Namen entspricht).
export default function AutolinkButton({
  contentType,
  slug,
}: {
  contentType: ContentToolType;
  slug: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<AutolinkPreviewResult | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [applied, setApplied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePreview() {
    setError(undefined);
    setApplied(null);
    startTransition(async () => {
      const result = await previewAutolinkAction(contentType, slug);
      if ("error" in result) setError(result.error);
      else setPreview(result);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await applyAutolinkAction(contentType, slug);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPreview(null);
      setApplied(
        `${result.matchCount} Verknüpfung${result.matchCount === 1 ? "" : "en"} gespeichert.`,
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
          {preview.matches.length === 0
            ? "Keine neuen Verknüpfungen gefunden."
            : `${preview.matches.length} Verknüpfung${preview.matches.length === 1 ? "" : "en"} gefunden:`}
        </p>

        {preview.matches.length > 0 && (
          <ul className="autolink-match-list">
            {preview.matches.map((m, i) => (
              <li key={i}>
                „{m.matchedText}“ → <b>{m.canonical}</b> ({TYPE_LABEL[m.type]})
              </li>
            ))}
          </ul>
        )}

        {preview.matches.length > 0 && (
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
          {preview.matches.length > 0 && (
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
        {pending ? "Prüfe…" : "Autolinking"}
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

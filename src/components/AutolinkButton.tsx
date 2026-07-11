"use client";
import { useMemo } from "react";
import {
  previewAutolinkAction,
  applyAutolinkAction,
  type ContentToolType,
  type AutolinkPreviewResult,
} from "@/app/actions/contentTools";
import { LinkIcon } from "@/lib/icons";
import { AutolinkTargetType } from "@/lib/autolink";
import { usePreviewConfirmAction } from "@/hooks/usePreviewConfirmAction";

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
  const { preview, error, applied, pending, handlePreview, handleConfirm, handleCancel } =
    usePreviewConfirmAction(
      contentType,
      slug,
      previewAutolinkAction,
      applyAutolinkAction,
      (result) =>
        `${result.matchCount} Verknüpfung${result.matchCount === 1 ? "" : "en"} gespeichert.`,
    );

  const distinctMatches = useMemo(
    () =>
      preview
        ? Object.values(
            preview.matches.reduce<
              Record<
                string,
                {
                  canonical: string;
                  href: string;
                  count: number;
                  matchedText: string;
                  type: AutolinkTargetType;
                }
              >
            >((acc, entry) => {
              if (!acc[entry.canonical]) {
                acc[entry.canonical] = {
                  canonical: entry.canonical,
                  href: entry.href,
                  count: 0,
                  matchedText: entry.matchedText,
                  type: entry.type,
                };
              }

              acc[entry.canonical].count++;

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
          {preview.matches.length === 0
            ? "Keine neuen Verknüpfungen gefunden."
            : `${preview.matches.length} Verknüpfung${preview.matches.length === 1 ? "" : "en"} gefunden:`}
        </p>

        {distinctMatches && distinctMatches.length > 0 && (
          <ul className="autolink-match-list">
            {distinctMatches.map((m, i) => (
              <li key={i}>
                „{m.matchedText}“ → <b>{m.canonical}</b> ({TYPE_LABEL[m.type]} /{" "}
                {m.count} mal)
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-[12px] items-center justify-start self-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="lcars-pill-btn--outline w-[40%]"
          >
            Abbrechen
          </button>
          {distinctMatches.length > 0 && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="lcars-pill-btn--outline disabled:opacity-50 w-[40%]"
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
        className="lcars-icon-btn disabled:opacity-50 size-[40px]"
        aria-label="Verlinkung hinzufügen"
        title="Verlinkung hinzufügen"
      >
        <LinkIcon />
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

"use client";
import { useMemo } from "react";
import {
  previewAutolinkAction,
  applyAutolinkAction,
  type ContentToolType,
  type AutolinkPreviewResult,
} from "@/app/actions/contentTools";
import { LinkIcon } from "@/lib/icons";
import { usePreviewConfirmAction } from "@/hooks/usePreviewConfirmAction";
import { groupByCount } from "@/lib/groupByCount";
import PreviewConfirmFooter from "./PreviewConfirmFooter";

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
        ? groupByCount(
            preview.matches,
            (entry) => entry.canonical,
            (entry) => ({
              canonical: entry.canonical,
              href: entry.href,
              matchedText: entry.matchedText,
              type: entry.type,
            }),
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
        <PreviewConfirmFooter
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          pending={pending}
          canConfirm={distinctMatches.length > 0}
          className="flex gap-[12px] items-center justify-start self-end"
          buttonClassName="lcars-pill-btn--outline w-[40%]"
        />

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

"use client";
import { useMemo, useState } from "react";
import {
  previewAutolinkAction,
  applyAutolinkAction,
  previewWikilinkCleanupAction,
  applyWikilinkCleanupAction,
  type ContentToolType,
  type AutolinkPreviewResult,
} from "@/app/actions/contentTools";
import { LinkIcon, UnlinkIcon } from "@/lib/icons";
import { usePreviewConfirmAction } from "@/hooks/usePreviewConfirmAction";
import { groupByCount } from "@/lib/groupByCount";
import PreviewConfirmFooter from "./PreviewConfirmFooter";
import ContentToolPreviewOverlay from "./ContentToolPreviewOverlay";

const TYPE_LABEL: Record<
  AutolinkPreviewResult["matches"][number]["type"],
  string
> = {
  character: "Charakter",
  mission: "Mission",
  archive: "Archiv",
};

type Mode = "autolink" | "delink";

// Admin/GM-only Content-Werkzeug auf den vier Inhalts-Detailseiten (Mission,
// Log, Archiv-Eintrag, Charakter) — vereint die früher getrennten
// AutolinkButton/RemoveWikilinksButton zu EINEM Aktions-Button, der zwischen
// „Verlinkung hinzufügen“ (Autolinking, siehe src/lib/autolink.ts) und
// „Verlinkung entfernen“ (Wikilink-Cleanup, siehe src/lib/wikilinkCleanup.ts)
// umschaltet. Default ist Autolink; der kleine Umschalter daneben flippt den
// Modus. Beide Modi laufen weiter über dasselbe Vorschau-vor-Speichern-Muster
// (usePreviewConfirmAction) — kein Blind-Apply, erst Trefferliste + Vorschau,
// dann explizites Bestätigen.
export default function ContentLinkToolButton({
  contentType,
  slug,
}: {
  contentType: ContentToolType;
  slug: string;
}) {
  const [mode, setMode] = useState<Mode>("autolink");

  // Beide Hooks unbedingt aufrufen (Rules of Hooks) — pro Modus eine eigene
  // Preview/Apply-Zustandsmaschine. Nur der aktive Modus ist klickbar, also
  // setzt immer höchstens eine der beiden Previews.
  const autolink = usePreviewConfirmAction(
    contentType,
    slug,
    previewAutolinkAction,
    applyAutolinkAction,
    (result) =>
      `${result.matchCount} Verknüpfung${result.matchCount === 1 ? "" : "en"} gespeichert.`,
  );
  const delink = usePreviewConfirmAction(
    contentType,
    slug,
    previewWikilinkCleanupAction,
    applyWikilinkCleanupAction,
    (result) =>
      `${result.removedCount} Wikilink${result.removedCount === 1 ? "" : "s"} entfernt.`,
  );

  const distinctMatches = useMemo(
    () =>
      autolink.preview
        ? groupByCount(
            autolink.preview.matches,
            (entry) => entry.canonical,
            (entry) => ({
              canonical: entry.canonical,
              href: entry.href,
              matchedText: entry.matchedText,
              type: entry.type,
            }),
          )
        : [],
    [autolink.preview],
  );

  const distinctRemoved = useMemo(
    () =>
      delink.preview
        ? groupByCount(
            delink.preview.removed,
            (entry) => entry.original,
            (entry) => ({
              original: entry.original,
              replacement: entry.replacement,
            }),
          )
        : [],
    [delink.preview],
  );

  // Autolink-Vorschau (identisch zum früheren AutolinkButton).
  if (autolink.preview) {
    return (
      <ContentToolPreviewOverlay
        title="Verlinkung hinzufügen — Vorschau"
        onClose={autolink.handleCancel}
      >
        <p className="lcars-eyebrow">
          {autolink.preview.matches.length === 0
            ? "Keine neuen Verknüpfungen gefunden."
            : `${autolink.preview.matches.length} Verknüpfung${autolink.preview.matches.length === 1 ? "" : "en"} gefunden:`}
        </p>

        {distinctMatches.length > 0 && (
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
          onCancel={autolink.handleCancel}
          onConfirm={autolink.handleConfirm}
          pending={autolink.pending}
          canConfirm={distinctMatches.length > 0}
        />

        {autolink.error && (
          <p className="text-lcars-red text-[13px]" role="alert">
            {autolink.error}
          </p>
        )}
      </ContentToolPreviewOverlay>
    );
  }

  // Delink-Vorschau (identisch zum früheren RemoveWikilinksButton).
  if (delink.preview) {
    return (
      <ContentToolPreviewOverlay
        title="Verlinkung entfernen — Vorschau"
        onClose={delink.handleCancel}
      >
        <p className="lcars-eyebrow">
          {delink.preview.removed.length === 0
            ? "Keine Wikilinks gefunden."
            : `${delink.preview.removed.length} Wikilink${delink.preview.removed.length === 1 ? "" : "s"} gefunden:`}
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

        {delink.preview.removed.length > 0 && (
          <div
            className="mission-body lcars-text autolink-preview-html"
            dangerouslySetInnerHTML={{ __html: delink.preview.previewHtml }}
          />
        )}

        <PreviewConfirmFooter
          onCancel={delink.handleCancel}
          onConfirm={delink.handleConfirm}
          pending={delink.pending}
          canConfirm={delink.preview.removed.length > 0}
        />

        {delink.error && (
          <p className="text-lcars-red text-[13px]" role="alert">
            {delink.error}
          </p>
        )}
      </ContentToolPreviewOverlay>
    );
  }

  const active = mode === "autolink" ? autolink : delink;

  return (
    <div className="flex flex-col gap-[6px] items-start w-[85%]">
      <div className="flex items-center gap-[5px]">
        <button
          type="button"
          onClick={active.handlePreview}
          disabled={active.pending}
          className={`lcars-icon-btn size-[40px] disabled:opacity-50${
            mode === "delink" ? " border-lcars-red" : ""
          }`}
          aria-label={
            mode === "autolink"
              ? "Verlinkung hinzufügen"
              : "Verlinkung entfernen"
          }
          title={
            mode === "autolink"
              ? "Verlinkung hinzufügen"
              : "Verlinkung entfernen"
          }
        >
          {mode === "autolink" ? <LinkIcon /> : <UnlinkIcon />}
        </button>
        <button
          type="button"
          onClick={() =>
            setMode((m) => (m === "autolink" ? "delink" : "autolink"))
          }
          disabled={active.pending}
          className="lcars-link-tool-toggle"
          aria-label={
            mode === "autolink"
              ? "Auf „Verlinkung entfernen“ umschalten"
              : "Auf „Verlinkung hinzufügen“ umschalten"
          }
          title={
            mode === "autolink"
              ? "Auf „Verlinkung entfernen“ umschalten"
              : "Auf „Verlinkung hinzufügen“ umschalten"
          }
        >
          {mode === "autolink" ? <UnlinkIcon /> : <LinkIcon />}
        </button>
      </div>
      {active.applied && (
        <p className="text-lcars-green text-[13px]" role="status">
          {active.applied}
        </p>
      )}
      {active.error && (
        <p className="text-lcars-red text-[13px]" role="alert">
          {active.error}
        </p>
      )}
    </div>
  );
}

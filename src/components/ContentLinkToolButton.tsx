"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  hasAutolinkMatchesAction,
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
  archive: "Datenbank",
};

type Mode = "autolink" | "delink";

// Admin/GM-only Content-Werkzeug auf den vier Inhalts-Detailseiten (Mission,
// Log, Archiv-Eintrag, Charakter) — vereint die früher getrennten
// AutolinkButton/RemoveWikilinksButton zu EINEM Aktions-Button, der zwischen
// „Verlinkung hinzufügen“ (Autolinking, siehe src/lib/autolink.ts) und
// „Verlinkung entfernen“ (Wikilink-Cleanup, siehe src/lib/wikilinkCleanup.ts)
// umschaltet — nach demselben Ein-Button-Toggle-Muster wie die
// Bookmark-/Abo-Buttons in FollowButtons.tsx (ein lcars-icon-btn, aktiver
// Zustand farblich hervorgehoben, kein separates Umschalt-Element daneben).
// Default ist Autolink; ein Klick auf den Button führt sofort die Aktion des
// gerade angezeigten Modus aus (kein zusätzlicher „Scharfstellen“-Klick nötig
// — deckungsgleich mit dem bisherigen Ein-Klick-Verhalten). Sobald die
// Vorschau danach schließt (bestätigt oder abgebrochen), wechselt der Modus
// automatisch zum jeweils anderen, sodass Delink über denselben Button ohne
// weiteres UI-Element erreichbar bleibt. Beide Modi laufen weiter über
// dasselbe Vorschau-vor-Speichern-Muster (usePreviewConfirmAction) — kein
// Blind-Apply, erst Trefferliste + Vorschau, dann explizites Bestätigen.
export default function ContentLinkToolButton({
  contentType,
  slug,
}: {
  contentType: ContentToolType;
  slug: string;
}) {
  const [mode, setMode] = useState<Mode>("autolink");

  // Beim Laden des Inhalts einmalig prüfen, ob Autolinking überhaupt noch
  // etwas fände — wenn nicht (schon alles verknüpft oder nichts zu
  // verknüpfen), ist Delink der wahrscheinlich sinnvollere Default-Modus.
  // Läuft bewusst nur einmal beim Mount (leeres Deps-Array): spätere
  // automatische Moduswechsel (siehe die beiden Effekte unten) sollen davon
  // unberührt bleiben.
  useEffect(() => {
    let cancelled = false;
    hasAutolinkMatchesAction(contentType, slug).then((hasMatches) => {
      if (!cancelled && !hasMatches) setMode("delink");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Springt automatisch zum jeweils anderen Modus, sobald eine offene
  // Vorschau schließt (egal ob durch Bestätigen oder Abbrechen) — erkannt an
  // preview: non-null → null. Läuft NICHT bei einem Fehler während des
  // Bestätigens (dort bleibt preview gesetzt, siehe usePreviewConfirmAction),
  // der Modus bleibt also stehen, bis der Vorgang tatsächlich abgeschlossen
  // oder abgebrochen wurde.
  const prevAutolinkPreview = useRef(autolink.preview);
  useEffect(() => {
    if (prevAutolinkPreview.current && !autolink.preview) setMode("delink");
    prevAutolinkPreview.current = autolink.preview;
  }, [autolink.preview]);

  const prevDelinkPreview = useRef(delink.preview);
  useEffect(() => {
    if (prevDelinkPreview.current && !delink.preview) setMode("autolink");
    prevDelinkPreview.current = delink.preview;
  }, [delink.preview]);

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
          <p className="text-lcars-quinary-ink text-[13px]" role="alert">
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

        <PreviewConfirmFooter
          onCancel={delink.handleCancel}
          onConfirm={delink.handleConfirm}
          pending={delink.pending}
          canConfirm={delink.preview.removed.length > 0}
        />

        {delink.error && (
          <p className="text-lcars-quinary-ink text-[13px]" role="alert">
            {delink.error}
          </p>
        )}
      </ContentToolPreviewOverlay>
    );
  }

  const active = mode === "autolink" ? autolink : delink;

  // Bewusst OHNE Status-/Fehlermeldung unterhalb des Buttons (vorerst): eine
  // solche Meldung würde diesen Wrapper breiter als den 40px-Button machen
  // und dadurch die übrigen Buttons in derselben Zeile (FollowButtons etc.,
  // siehe ActionsMenu.tsx) nach rechts verschieben.
  return (
    <button
      type="button"
      onClick={active.handlePreview}
      disabled={active.pending}
      className={`lcars-icon-btn size-[40px] disabled:opacity-50${
        mode === "delink" ? " bg-lcars-quinary text-lcars-bg" : ""
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
  );
}

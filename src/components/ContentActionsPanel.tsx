"use client";
import type { ComponentProps } from "react";
import ActionsMenu from "./ActionsMenu";
import ContentImageGallery from "./ContentImageGallery";
import type { ContentImageType } from "@/lib/contentImages";

// Die Aktionen einer Inhaltsseite in einem zugeklappten Feld am Fuß des
// Inhalts.
//
// Vorher standen sie ganz oben, zwischen Titel und Text: ein Owner-Auswahlfeld
// und bis zu sieben unbeschriftete runde Knöpfe. Wer den Eintrag lesen wollte,
// musste erst an der Redaktion vorbei. Gelesen wird hier aber häufiger als
// verwaltet, also gehört das Verwalten ans Ende und hinter einen Klick. Der
// Lesemodus-Schalter bleibt oben — er gehört zum Lesen, nicht zum Verwalten.
//
// Für nicht angemeldete Besucher entfällt das Feld ganz: sie können nichts
// verwalten. Ihnen bleibt die Bilder-Galerie, die vorher Teil derselben Leiste
// war — sie zeigt die Bilder des Eintrags und ist eine Lesehilfe, keine
// Verwaltung.
export default function ContentActionsPanel({
  imageContentType,
  imageContentId,
  ...actions
}: ComponentProps<typeof ActionsMenu> & {
  imageContentType: ContentImageType | null;
  imageContentId: number;
}) {
  if (!actions.viewer?.role) {
    if (!imageContentType) return null;
    return (
      <div className="content-actions-anon">
        <ContentImageGallery
          contentType={imageContentType}
          contentId={imageContentId}
          canManage={false}
        />
      </div>
    );
  }

  return (
    <details className="content-actions">
      <summary className="content-actions-head">Aktionen &amp; Verwaltung</summary>
      <div className="content-actions-body">
        <ActionsMenu {...actions} />
      </div>
    </details>
  );
}

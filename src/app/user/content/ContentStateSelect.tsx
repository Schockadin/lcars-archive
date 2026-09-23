"use client";
import ContentStateSwitch from "@/components/ContentStateSwitch";
import { setContentStateAction, type VisibilityContentType } from "./actions";

// Entwurf oder veröffentlicht — der eine Sichtbarkeits-Schalter jedes Inhalts
// (bis v1.34 waren es drei Stufen „Privat/GM/Öffentlich" PLUS ein
// Entwurf-Häkchen im Editor). Hier steht er direkt in der Liste: Ein Entwurf
// lässt sich veröffentlichen, ohne ihn erst im Editor zu öffnen.
//
// Zwei Knöpfe (LcarsSwitch) statt eines <select>: Ein geschlossenes
// <select> behält nach der Auswahl den Fokus, und ein fokussiertes <select>
// wechselt bei JEDEM Pfeiltasten-Druck (Chrome/Firefox) bzw. Mausrad (Firefox)
// zur nächsten Option und feuert dabei ein change-Ereignis. Wer also einen
// Inhalt auf „Entwurf" stellte und danach mit der Tastatur weiterscrollte,
// veröffentlichte ihn Sekunden später versehentlich wieder — inklusive
// Benachrichtigung an alle Abonnenten, denn „Entwurf" ist die erste und
// „Veröffentlicht" die nächste Option. Knöpfe kennen diese Drift nicht:
// Pfeiltasten, Bild-ab und Mausrad scrollen dort die Seite, und Leer-/
// Eingabetaste lösen nur den Knopf aus, auf dem der Fokus ohnehin steht —
// also den bereits aktiven Zustand (siehe den Gleichheits-Check unten).
//
export default function ContentStateSelect({
  contentType,
  id,
  isDraft,
  onPublished,
}: {
  contentType: VisibilityContentType;
  id: number;
  isDraft: boolean;
  // Wird INNERHALB derselben Transition wie der Action-Aufruf gerufen, wenn
  // aus einem Entwurf ein veröffentlichter Inhalt wird. Für Listen, die
  // ausschließlich Entwürfe führen (DraftsSection): Der Eintrag gehört dann
  // nicht mehr dahin und verschwindet sofort, statt bis zur nächsten
  // Revalidierung stehen zu bleiben. Wie bei onOptimisticDelete holt React
  // ihn automatisch zurück, falls die Action scheitert — vorausgesetzt, die
  // Action revalidiert die Seite (siehe revalidatePath in actions.ts).
  onPublished?: () => void;
}) {
  return (
    <ContentStateSwitch
      isDraft={isDraft}
      action={(next) => setContentStateAction(contentType, id, next)}
      onPublished={onPublished}
      ariaLabel="Veröffentlichung"
      className="flex flex-col items-end gap-[2px]"
    />
  );
}

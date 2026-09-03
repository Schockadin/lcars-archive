"use client";
import { useState } from "react";
import { FileTextIcon } from "@/lib/icons";
import CharacterSheetPreviewOverlay from "@/components/character/CharacterSheetPreviewOverlay";
import type { CharacterSheetPreviewInput } from "@/components/character/CharacterSheetPreview";

// Knopf über den Panels: öffnet den Charakterbogen als dreiblättrige Vorschau
// (Bogen, Talent-Spickzettel, Biografie) — dort stehen dann Drucken und
// Speichern als Icon-Knöpfe.
//
// Die Vorschau zeigt den GESPEICHERTEN Stand: sie wird aus den Daten der
// Seite gebaut, die nach jedem Speichern frisch geladen werden. Ein gerade
// getippter, noch nicht gespeicherter Wert steht also bewusst noch nicht
// darauf — genauso wenig, wie er im PDF stünde.
export default function CharacterSheetButton({
  input,
  characterId,
}: {
  input: CharacterSheetPreviewInput;
  characterId: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-pill-btn--outline inline-flex items-center gap-[8px] self-start"
      >
        <FileTextIcon />
        Charakterbogen
      </button>

      {open && (
        <CharacterSheetPreviewOverlay
          input={input}
          downloadUrl={`/api/export/character-sheet?characterId=${characterId}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

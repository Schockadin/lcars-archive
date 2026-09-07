"use client";
import { useState } from "react";
import CharacterSheetPreviewOverlay from "@/components/character/CharacterSheetPreviewOverlay";
import type { CharacterSheetPreviewInput } from "@/components/character/CharacterSheetPreview";

// Der Name in der ersten Spalte des Gruppenblatts: ein Klick öffnet den
// vollständigen Charakterbogen als Fenster (Personalakte, Spickzettel,
// Regeln, Biografie) — dasselbe Fenster wie unter „Meine Charaktere", nur
// eben für jede Figur am Tisch.
//
// Ein Knopf statt eines Links: die Tabelle soll beim Nachschlagen stehen
// bleiben. Wer die Charakterseite selbst will, folgt dem Link darunter.
export default function PartyMemberSheet({
  characterId,
  name,
  input,
}: {
  characterId: number;
  name: string;
  input: CharacterSheetPreviewInput;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="party-sheet-name"
        onClick={() => setOpen(true)}
      >
        {name}
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

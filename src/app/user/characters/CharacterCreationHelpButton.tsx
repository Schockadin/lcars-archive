"use client";
import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import CharacterCreationGuide from "@/components/character/CharacterCreationGuide";
import { tutorialSectionHref } from "@/lib/tutorialSections";

// „Erschaffung erklärt" über der eigenen Charakterliste: derselbe Text wie im
// Anleitungs-Abschnitt „Charaktererschaffung", nur als Fenster genau dort, wo
// man ihn braucht — wer gerade eine Figur anlegt, soll die Erklärung nicht auf
// einer anderen Seite suchen und die halb ausgefüllte Seite verlassen müssen.
//
// Der Inhalt kommt aus CharacterCreationGuide, damit Anleitung und Fenster
// nicht auseinanderlaufen; der Rahmen (Portal, Escape, Klick daneben,
// Fokus-Rückgabe) aus ModalOverlay, wie bei allen anderen Fenstern.
//
// Der Link auf die Anleitung bleibt im Fenster stehen: Wer den Abschnitt
// verlinken oder daneben weiterlesen will, kommt so dorthin.
export default function CharacterCreationHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-pill-btn--outline max-sm:self-stretch"
      >
        Erschaffung erklärt
      </button>

      {open && (
        <ModalOverlay
          title="Charaktererschaffung"
          onClose={() => setOpen(false)}
          width={760}
        >
          <CharacterCreationGuide />
          <p className="lcars-text text-[13px]">
            <a
              href={tutorialSectionHref("charaktererschaffung")}
              className="lcars-wikilink"
            >
              Derselbe Abschnitt in der Anleitung
            </a>
          </p>
        </ModalOverlay>
      )}
    </>
  );
}

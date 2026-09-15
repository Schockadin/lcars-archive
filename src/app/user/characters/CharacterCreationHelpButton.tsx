"use client";
import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import CharacterCreationGuide from "@/components/character/CharacterCreationGuide";
import { tutorialSectionHref } from "@/lib/tutorialSections";

// „Erschaffung erklärt": derselbe Text wie im Anleitungs-Abschnitt
// „Charaktererschaffung", nur als Fenster genau dort, wo man ihn braucht.
// Steht auf allen drei Seiten, an denen man an einer Figur arbeitet:
//
//   /user/characters              — die Übersicht, vor dem Anlegen
//   /user/characters/new          — im Assistenten selbst
//   /user/characters/[characterId] — später beim Steigern und Nachtragen
//
// Nachschlagen soll nirgends bedeuten, die halb ausgefüllte Seite zu
// verlassen; deshalb ein Fenster und kein Link auf /tutorial.
//
// Der Inhalt kommt aus CharacterCreationGuide, damit Anleitung und Fenster
// nicht auseinanderlaufen; der Rahmen (Portal, Escape, Klick daneben,
// Fokus-Rückgabe) aus ModalOverlay, wie bei allen anderen Fenstern.
//
// Der Link auf die Anleitung bleibt im Fenster stehen: Wer den Abschnitt
// verlinken oder daneben weiterlesen will, kommt so dorthin.
export default function CharacterCreationHelpButton({
  className = "lcars-pill-btn--outline max-sm:self-stretch",
}: {
  // Damit sich der Knopf in die jeweilige Leiste einfügt: In der Übersicht
  // steht er in einem Knopf-Stapel, im Assistenten und auf der Charakterseite
  // allein über dem Inhalt.
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Erschaffung erklärt
      </button>

      {open && (
        // Breit und hoch: Das ist ein Fenster zum Lesen, kein Formular — bei
        // 760px stand der Text in einer schmalen Säule, und die Schemata
        // neben den Abschnitten (ab 900px) hatten gar keinen Platz.
        <ModalOverlay
          title="Charaktererschaffung"
          onClose={() => setOpen(false)}
          width={1040}
          tall
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

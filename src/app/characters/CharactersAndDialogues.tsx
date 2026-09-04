"use client";
import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LcarsSwitch } from "@/components/lcars";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import type { CharacterListItem } from "@/lib/characters";
import type { ArchiveEntryPreview } from "@/types/archive";
import CharacterPage from "./CharacterPage";
import DialogueList from "./dialogues/DialogueList";

type Tab = "characters" | "dialogues";

// Charakterliste und Gesprächs-Übersicht als gemeinsame Ansicht: auf breiten
// Screens beide Spalten nebeneinander, auf schmalen Screens per Umschalter
// (nur eine Spalte gleichzeitig sichtbar, siehe .chars-dialogues-* in
// character.css). Von /characters/page.tsx und /characters/dialogues/page.tsx
// mit demselben Datensatz, aber unterschiedlichem initialTab gerendert.
export default function CharactersAndDialogues({
  pageTitle,
  characters,
  dialogueEntries,
  initialTab = "characters",
  initialParticipant = null,
}: {
  pageTitle: string;
  characters: CharacterListItem[];
  dialogueEntries: ArchiveEntryPreview[];
  initialTab?: Tab;
  initialParticipant?: string | null;
}) {
  usePageMeta(pageTitle, "characters");
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div
      className="chars-dialogues-layout lcars-split lcars-wide-column"
      data-active-tab={tab}
    >
      <LcarsSwitch
        className="chars-dialogues-switch md:hidden"
        options={[
          { key: "characters" as Tab, label: "Charaktere" },
          { key: "dialogues" as Tab, label: "Gespräche" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div
        className="chars-dialogues-col w-full max-w-[640px]"
        data-tab="characters"
      >
        <CharacterPage characters={characters} />
      </div>

      <div className="chars-dialogues-col" data-tab="dialogues">
        <h1 className="lcars-data-row-heading">
          {CATEGORY_CONFIG.dialogue.plural}
        </h1>
        {dialogueEntries.length === 0 ? (
          <p className="lcars-empty-state">
            Keine Einträge in dieser Kategorie.
          </p>
        ) : (
          <DialogueList
            key={initialParticipant ?? "all"}
            entries={dialogueEntries}
            initialParticipant={initialParticipant}
          />
        )}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import NewMissionLogForm from "@/app/user/mission-logs/new/NewMissionLogForm";
import CreateDialogueForm from "@/app/user/dialogues/new/CreateDialogueForm";
import NewArchiveEntryForm from "@/app/user/archive/new/NewArchiveEntryForm";
import NewMissionForm from "@/app/user/missions/new/NewMissionForm";
import type { NewContentData } from "./newContentData";

// Die Knöpfe „Neue Inhalte" unter /user/content — jeder öffnet sein Formular
// in einem Fenster über der Liste, statt auf eine eigene Seite zu führen.
// Dasselbe Muster wie „Eintrag anlegen" in der Datenbank
// (ArchiveEntryCreateOverlay.tsx) und „Ereignis eintragen" in der Chronologie
// (ManualEventForm.tsx): Wer etwas anlegt, verliert die Übersicht nicht aus
// den Augen und landet nach dem Abbrechen wieder dort, wo er war.
//
// Die Formulare selbst sind unverändert die der Anlege-Seiten — die bleiben
// erreichbar (Lesezeichen, Direktlinks, die Knöpfe anderer Seiten) und sind
// weiterhin die Wahrheit über Aufbau und Berechtigung; die Server-Actions
// prüfen ohnehin selbst.
//
// Die Daten, die diese Formulare brauchen (Missionen, NPCs, Orte …), lädt die
// Seite vorab und reicht sie hier durch — ein Fenster kann nicht selbst
// nachladen. Geladen wird nur, was der jeweilige Knopf überhaupt zeigt (siehe
// page.tsx).
//
// Charaktere kommen hier nicht vor — sie haben mit /user/characters ihren
// eigenen Bereich, und ihr Assistent führt über mehrere Schritte, die in
// einem Fenster keinen Platz hätten.
export type OpenForm = "missionLog" | "dialogue" | "archiveEntry" | "npc" | "mission";

const TITLES: Record<OpenForm, string> = {
  missionLog: "Neuen Missionslog anlegen",
  dialogue: "Neues Gespräch beginnen",
  archiveEntry: "Neuen Datenbank-Eintrag anlegen",
  npc: "Neuen NPC anlegen",
  mission: "Neue Mission anlegen",
};

export default function NewContentButtons({
  data,
  show,
}: {
  data: NewContentData;
  // Welche Knöpfe erscheinen. Ohne Angabe alle — so zeigt „Meine Inhalte"
  // weiterhin das volle Angebot. Das Dashboard reicht hier die zwei Knöpfe
  // durch, die dort eingeschaltet sind (siehe dashboardSections.ts); die
  // Formulare selbst bleiben dieselben.
  show?: readonly OpenForm[];
}) {
  const [open, setOpen] = useState<OpenForm | null>(null);
  const close = () => setOpen(null);
  const visible = (form: OpenForm) => !show || show.includes(form);

  const button = (form: OpenForm, label: string) => (
    <button
      type="button"
      onClick={() => setOpen(form)}
      className="lcars-pill-btn w-[260px] max-w-full max-sm:w-full"
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Nebeneinander statt untereinander (lcars-btn-stack): Die Knöpfe
          stehen jetzt über der Liste, gestapelt schöben sie sie weit nach
          unten. Die feste Breite hält sie untereinander gleich groß — wie im
          Stapel. */}
      <div className="flex flex-wrap gap-[12px]">
        {visible("missionLog") &&
          data.missionLog &&
          button("missionLog", "Neuer Missionslog")}
        {visible("dialogue") &&
          data.dialogue &&
          button("dialogue", "Neues Gespräch")}
        {/* Anders als Missionslog/Gespräch (eigener Charakter) oder Mission
            (gm/admin) sind Datenbank-Einträge an keine Voraussetzung
            geknüpft — jeder eingeloggte User darf welche anlegen. */}
        {visible("archiveEntry") && button("archiveEntry", "Neuer Datenbank-Eintrag")}
        {/* Ein NPC ist kein eigener Charakter, sondern ein Datenbank-Eintrag
            der Kategorie „NPC" — dasselbe Formular mit vorgewählter
            Kategorie. */}
        {visible("npc") && button("npc", "Neuer NPC")}
        {visible("mission") && data.mission && button("mission", "Neue Mission")}
      </div>

      {open && (
        <ModalOverlay title={TITLES[open]} onClose={close} width={960}>
          {open === "missionLog" &&
            data.missionLog &&
            (data.missionLog.missions.length === 0 ? (
              // Denselben Hinweis gab die Anlege-Seite; im Fenster darf er
              // nicht verloren gehen, sonst stünde man vor einem Formular
              // ohne wählbare Mission.
              <p className="lcars-text">
                Es gibt noch keine Missionen, denen ein Log zugeordnet werden
                könnte.
              </p>
            ) : (
              <NewMissionLogForm
                userId={data.userId}
                ownCharacters={data.missionLog.ownCharacters}
                missions={data.missionLog.missions}
                defaultSessionNr={data.missionLog.defaultSessionNr}
                defaultLogDate={data.missionLog.defaultLogDate}
              />
            ))}
          {open === "dialogue" && data.dialogue && (
            <CreateDialogueForm
              userId={data.userId}
              ownCharacters={data.dialogue.ownCharacters}
              partnerCharacters={data.dialogue.partnerCharacters}
              npcs={data.dialogue.npcs}
              canPlayNpcs={data.dialogue.canPlayNpcs}
              gms={data.dialogue.gms}
              locations={data.dialogue.locations}
              defaultLogDate={data.dialogue.defaultLogDate}
            />
          )}
          {(open === "archiveEntry" || open === "npc") && (
            <NewArchiveEntryForm
              userId={data.userId}
              initialCategory={open === "npc" ? "npc" : "other"}
            />
          )}
          {open === "mission" && data.mission && (
            <NewMissionForm
              userId={data.userId}
              defaultStartedAt={data.mission.defaultStartedAt}
              characters={data.mission.characters}
            />
          )}
        </ModalOverlay>
      )}
    </>
  );
}

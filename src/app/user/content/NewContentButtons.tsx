"use client";
import { useState } from "react";
import Link from "next/link";
import ModalOverlay from "@/components/ModalOverlay";
import NewMissionLogForm from "@/app/user/mission-logs/new/NewMissionLogForm";
import CreateDialogueForm from "@/app/user/dialogues/new/CreateDialogueForm";
import NewArchiveEntryForm from "@/app/user/archive/new/NewArchiveEntryForm";
import NewMissionForm from "@/app/user/missions/new/NewMissionForm";
import ManualEventForm from "@/components/timeline/ManualEventForm";
import type { NewContentData } from "./newContentData";
import {
  NEW_CONTENT_LABELS,
  NEW_CONTENT_TITLES,
  visibleNewContentForms,
  type OpenForm,
} from "./newContentForms";

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
export default function NewContentButtons({
  data,
  show,
  canImport = false,
}: {
  data: NewContentData;
  // Welche Knöpfe erscheinen. Ohne Angabe alle — so zeigt „Meine Inhalte"
  // weiterhin das volle Angebot. Das Dashboard reicht hier die dort
  // eingeschalteten durch (siehe dashboardSections.ts); die Formulare selbst
  // bleiben dieselben.
  show?: readonly OpenForm[];
  // Der Markdown-Import. Anders als die übrigen kein Fenster, sondern ein
  // Link auf /user/import: Der Ablauf blättert durch mehrere Dateien und
  // bestätigt jede einzeln — dafür ist ein Fenster zu klein (gleiche
  // Überlegung wie beim Charakter-Assistenten).
  //
  // Kein Rechte-Schalter: Einen Datenbank-Eintrag darf jede eingeloggte
  // Person hochladen, die Seite zeigt dann eben nur diese eine Art an
  // (src/lib/importAccess.ts). Der Aufrufer entscheidet damit nur, OB der
  // Knopf hier Platz bekommt — die Startseite etwa nur, wenn die Sektion im
  // Profil eingeschaltet ist.
  canImport?: boolean;
}) {
  const [open, setOpen] = useState<OpenForm | null>(null);
  const close = () => setOpen(null);
  const sichtbar = visibleNewContentForms(data, show);

  // Breite und Umbruch kommen aus .lcars-btn-row (controls.css) — hier steht
  // nur, was der Knopf ist, nicht wie breit er wird.
  const button = (form: OpenForm) => {
    // Das Event-Formular verwaltet sein Fenster selbst, weil dieselbe
    // Komponente auch in Chronologie und Inhaltsliste zum Bearbeiten dient.
    if (form === "event" && data.event) {
      return (
        <ManualEventForm
          key={form}
          defaultDate={data.event.defaultDate}
          characters={data.event.characters}
          triggerVariant="pill"
          dateHint="Vorbelegt mit dem jüngsten Logbuch-Datum"
        />
      );
    }
    return (
      <button
        key={form}
        type="button"
        onClick={() => setOpen(form)}
        className="lcars-pill-btn"
      >
        {NEW_CONTENT_LABELS[form]}
      </button>
    );
  };

  return (
    <>
      {/* Drei Stufen, siehe .lcars-btn-row in controls.css: schmal einer pro
          Zeile, mittel zwei, breit alle nebeneinander. */}
      <div className="lcars-btn-row">
        {/* Welche Knöpfe hier stehen, entscheidet visibleNewContentForms —
            dieselbe Funktion, aus der der Abschnitt drumherum seine Kurzinfo
            bildet (siehe newContentForms.ts). */}
        {sichtbar.map(button)}
        {canImport && (
          <Link href="/user/import" className="lcars-pill-btn--outline">
            Import
          </Link>
        )}
      </div>

      {open && (
        <ModalOverlay
          title={NEW_CONTENT_TITLES[open]}
          onClose={close}
          width={960}
        >
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

"use client";
import { useState } from "react";
import { useActionState } from "react";
import {
  updateDashboardSettingsAction,
  type DashboardSettingsState,
} from "./dashboardSettingsActions";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import {
  DASHBOARD_SECTIONS,
  dashboardCharacterVisible,
  dashboardSectionEnabled,
  type DashboardPrefs,
} from "@/lib/dashboardSections";

const initialState: DashboardSettingsState = {};

export interface DashboardCharacterChoice {
  id: number;
  name: string;
}

// Was auf der Startseite erscheint — eine Checkbox je Sektion, darunter die
// eigenen Charaktere einzeln.
//
// Gleiches Re-Mount-per-key-Muster wie NewsSettingsForm: Die Checkboxen sind
// unkontrolliert (defaultChecked), nach dem Speichern sollen sie aber den
// frisch bestätigten Stand zeigen — der Zähler im key hängt sie dafür neu ein.
export default function DashboardSettingsForm({
  prefs,
  characters,
}: {
  prefs: DashboardPrefs;
  // Die eigenen Charaktere. Leer = die Unterliste entfällt; die Sektion
  // selbst bleibt wählbar, damit sie beim ersten Charakter sofort greift.
  characters: DashboardCharacterChoice[];
}) {
  const [state, formAction, pending] = useActionState(
    updateDashboardSettingsAction,
    initialState,
  );

  const [saveCount, setSaveCount] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setSaveCount((c) => c + 1);
  }

  const aktuell = state.success && state.prefs ? state.prefs : prefs;

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      <p className="text-lcars-ink-dim text-[13px]">
        Lege fest, welche Abschnitte auf deiner Startseite erscheinen. Was du
        abwählst, wird auch nicht mehr geladen. Ein eingeschalteter Abschnitt
        bleibt leer, solange er nichts zu zeigen hat.
      </p>

      <div className="flex flex-col gap-[10px]">
        {DASHBOARD_SECTIONS.map((section) => (
          <div key={section.id} className="flex items-start gap-[10px]">
            {/* Das versteckte Feld daneben sagt der Action, dass dieses
                Formular die Sektion kannte — sonst wäre ein entferntes
                Häkchen von „kennt die Sektion nicht" nicht zu unterscheiden
                (siehe dashboardSettingsActions.ts). */}
            <input type="hidden" name="knownSections" value={section.id} />
            <input
              key={`section-${section.id}-${saveCount}`}
              id={`dashboard-${section.id}`}
              name="sections"
              type="checkbox"
              value={section.id}
              defaultChecked={dashboardSectionEnabled(aktuell, section.id)}
              className="lcars-checkbox mt-[2px]"
            />
            <label
              htmlFor={`dashboard-${section.id}`}
              className="flex flex-col gap-[2px]"
            >
              <span className="lcars-eyebrow">{section.label}</span>
              <span className="text-lcars-ink-dim text-[12px]">
                {section.hint}
              </span>
            </label>
          </div>
        ))}
      </div>

      {characters.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          <p className="lcars-eyebrow text-lcars-primary-ink">
            Diese Charaktere zeigen
          </p>
          <p className="text-lcars-ink-dim text-[12px]">
            Gilt nur, solange „Meine Charaktere“ oben eingeschaltet ist.
          </p>
          {characters.map((character) => (
            <div key={character.id} className="flex items-center gap-[10px]">
              <input
                type="hidden"
                name="knownCharacters"
                value={character.id}
              />
              <input
                key={`character-${character.id}-${saveCount}`}
                id={`dashboard-character-${character.id}`}
                name="characters"
                type="checkbox"
                value={character.id}
                defaultChecked={dashboardCharacterVisible(
                  aktuell,
                  character.id,
                )}
                className="lcars-checkbox"
              />
              <label
                htmlFor={`dashboard-character-${character.id}`}
                className="lcars-eyebrow"
              >
                {character.name}
              </label>
            </div>
          ))}
        </div>
      )}

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}

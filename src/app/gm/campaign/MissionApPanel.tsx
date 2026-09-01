"use client";
import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import type { CompletableMission, ActiveCharacter } from "@/lib/gameSessions";
import { completeMissionAction, type MissionApState } from "./missionApActions";

const initialState: MissionApState = {};

// Missionsabschluss: Mission wählen, AP vergeben, fertig. Der Statuswechsel auf
// „abgeschlossen" gehört fest dazu — deshalb gibt es die Missions-AP nur hier
// und nicht mehr als freie Buchung.
export default function MissionApPanel({
  missions,
  characters,
}: {
  missions: CompletableMission[];
  characters: ActiveCharacter[];
}) {
  const [state, formAction, pending] = useActionState(
    completeMissionAction,
    initialState,
  );
  const [missionId, setMissionId] = useState("");

  const selected = missions.find((m) => String(m.id) === missionId);

  if (missions.length === 0) {
    return <p className="lcars-empty-state">Keine Missionen vorhanden.</p>;
  }

  return (
    <form
      key={state.success ?? "mission-ap"}
      action={formAction}
      className="flex flex-col gap-[12px]"
    >
      <div className="flex flex-wrap items-end gap-[8px]">
        <label className="flex flex-col gap-[4px] flex-1 min-w-[220px]">
          <span className="lcars-eyebrow">Mission</span>
          <select
            name="missionId"
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            className="lcars-input rounded-full w-full"
          >
            <option value="">— bitte wählen —</option>
            {missions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.title}
                {mission.status === "completed" ? " (abgeschlossen)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">AP je Charakter</span>
          <input
            name="amount"
            type="number"
            min={0}
            defaultValue={5}
            className="lcars-input rounded-full w-[110px] text-right"
          />
        </label>
        <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
          <span className="lcars-eyebrow">Notiz (optional)</span>
          <input
            name="note"
            type="text"
            placeholder="Standard: der Missionstitel"
            className="lcars-input rounded-full w-full"
          />
        </label>
      </div>

      {selected && selected.apAwarded > 0 && (
        <p className="text-lcars-ink-dim text-[13px]">
          Für diese Mission wurden bereits {selected.apAwarded} AP vergeben — ein
          erneutes Buchen kommt obendrauf.
        </p>
      )}

      <fieldset className="flex flex-col gap-[6px]">
        <legend className="lcars-eyebrow">Gutschreiben an</legend>
        {characters.length === 0 ? (
          <p className="lcars-empty-state">
            Keine aktiven Charaktere mit verknüpftem Konto.
          </p>
        ) : (
          <div className="flex flex-wrap gap-[12px]">
            {characters.map((character) => (
              <label key={character.id} className="flex items-center gap-[6px]">
                <input
                  type="checkbox"
                  name="characterIds"
                  value={character.id}
                  defaultChecked
                />
                <span>{character.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={pending || !missionId}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        Mission abschließen und AP vergeben
      </button>

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </form>
  );
}

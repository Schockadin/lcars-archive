"use client";
import { useActionState } from "react";
import { setIngameYearAction, type IngameYearState } from "./actions";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import type { IngameYearInfo } from "@/lib/campaign";

// Einstellung des aktuellen Ingame-Jahres der Kampagne (siehe
// src/lib/campaign.ts) — daraus wird zusammen mit dem Geburtsdatum eines
// Charakters dessen angezeigtes Alter abgeleitet. Standardmäßig wird das Jahr
// automatisch aus dem chronologisch spätesten Missionslog abgeleitet und folgt
// neuen Logs; ein manuelles Überschreiben (mit Bestätigung) friert es ein, bis
// wieder auf „Automatisch" zurückgeschaltet wird.
export default function IngameYearForm({ info }: { info: IngameYearInfo }) {
  const initialState: IngameYearState = {};
  const [state, formAction, pending] = useActionState(
    setIngameYearAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[12px] max-w-[380px]">
      <div className="flex items-center gap-[8px] flex-wrap">
        <span className="lcars-eyebrow">Aktuelles Ingame-Jahr</span>
        <span
          className={`rounded-full px-[10px] py-[1px] text-[11px] font-bold uppercase ${
            info.isAuto
              ? "bg-lcars-senary text-black"
              : "bg-lcars-primary text-black"
          }`}
        >
          {info.isAuto ? "Automatisch" : "Manuell"}
        </span>
      </div>

      <p className="text-[15px]">
        {info.effectiveYear != null ? (
          <>
            <b className="text-lcars-primary text-[22px] align-middle">
              {info.effectiveYear}
            </b>{" "}
            <span className="text-lcars-ink-dim">
              {info.isAuto
                ? "— abgeleitet aus dem spätesten Missionslog"
                : "— manuell gesetzt (fix)"}
            </span>
          </>
        ) : (
          <span className="text-lcars-ink-dim">
            Noch kein Jahr — es gibt keinen Missionslog mit Datum, aus dem sich
            eins ableiten ließe.
          </span>
        )}
      </p>

      <label htmlFor="ingameYear" className="lcars-eyebrow">
        Manuell überschreiben
      </label>
      <input
        id="ingameYear"
        name="ingameYear"
        type="number"
        min={0}
        defaultValue={info.effectiveYear ?? ""}
        placeholder="z.B. 2402"
        className="rounded-lcars-pill lcars-input w-full"
      />
      <p className="text-lcars-ink-dim text-[13px]">
        Ein manuell gesetztes Jahr bleibt fix und wird <b>nicht</b> mehr
        automatisch aus neuen Missionslogs aktualisiert, bis du auf
        „Automatisch“ zurückschaltest. Das angezeigte Charakter-Alter ergibt
        sich aus diesem Jahr minus Geburtsjahr.
      </p>

      <FormError message={state?.error} />
      {state?.success && (
        <FormSuccess>
          {state.auto
            ? "Automatik aktiviert — das Ingame-Jahr folgt jetzt dem spätesten Missionslog."
            : `Ingame-Jahr manuell auf ${state.year} gesetzt.`}
        </FormSuccess>
      )}

      <div className="flex flex-wrap gap-[8px]">
        <button
          type="submit"
          name="mode"
          value="manual"
          disabled={pending}
          onClick={(e) => {
            const input = e.currentTarget.form?.elements.namedItem(
              "ingameYear",
            ) as HTMLInputElement | null;
            const value = input?.value.trim();
            // Leer → die Action liefert eine Fehlermeldung; nur bei echtem Wert
            // vorher bestätigen (Überschreiben friert die Automatik ein).
            if (
              value &&
              !confirm(
                `Ingame-Jahr manuell auf ${value} überschreiben? Es wird dann nicht mehr automatisch aus neuen Missionslogs aktualisiert.`,
              )
            ) {
              e.preventDefault();
            }
          }}
          className="lcars-pill-btn--outline disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Überschreiben"}
        </button>
        <button
          type="submit"
          name="mode"
          value="auto"
          disabled={pending || info.isAuto}
          title={
            info.isAuto
              ? "Bereits automatisch"
              : "Manuellen Override entfernen und wieder automatisch ableiten"
          }
          className="lcars-pill-btn--outline disabled:opacity-40"
        >
          Automatisch
          {info.inferredYear != null ? ` (${info.inferredYear})` : ""}
        </button>
      </div>
    </form>
  );
}

"use client";
import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { AP_REASON_LABELS, type ApReason } from "@/lib/apReasons";
import type { AdvancementRules } from "@/lib/advancement";
import { awardApAction, type ApAwardState } from "./apActions";

const initialState: ApAwardState = {};

// Gründe, die die Spielleitung frei bucht. "advancement" und "creation" fehlen
// bewusst — die bucht der Charakterbogen selbst (Steigern bzw. Festschreiben
// der Erschaffung). "mission" fehlt ebenfalls: Missions-AP gibt es nur über den
// Missionsabschluss, damit die Mission dabei zwingend ausgewählt und auf
// „abgeschlossen" gesetzt wird (siehe MissionApPanel.tsx).
const AWARD_REASONS: ApReason[] = ["session", "logbook", "bonus", "manual"];

// Schnellvergabe nach den Regeln der Runde: eine gespielte Session und ein
// geschriebenes Logbuch geben je einen eingestellten Betrag (Standard 1 AP),
// ein Missions-/Story-Abschluss einen frei wählbaren. Die Beträge kommen aus
// dem konfigurierbaren Regelwerk (/gm/ap), nicht aus fest verdrahteten Zahlen.
function quickAwards(
  rules: AdvancementRules,
): { reason: ApReason; amount: number; label: string }[] {
  const awards: { reason: ApReason; amount: number; label: string }[] = [
    { reason: "session", amount: rules.apPerSession, label: `+${rules.apPerSession} Session` },
    { reason: "logbook", amount: rules.apPerLogbook, label: `+${rules.apPerLogbook} Logbuch` },
  ];
  return awards.filter((quick) => quick.amount > 0);
}

export interface ApCharacterRow {
  id: number;
  name: string;
  available: number;
}

// AP-Vergabe der Spielleitung: je Charakter eine Zeile mit Kontostand, den
// beiden Schnellknöpfen und einer freien Buchung (Betrag, Grund, Notiz).
export default function ApAwardPanel({
  characters,
  rules,
}: {
  characters: ApCharacterRow[];
  rules: AdvancementRules;
}) {
  const [state, formAction, pending] = useActionState(
    awardApAction,
    initialState,
  );
  // Freie Buchung nur für die aufgeklappte Zeile — sonst würde die Tabelle bei
  // vielen Charakteren zur Formularwüste.
  const [openId, setOpenId] = useState<number | null>(null);
  const quick = quickAwards(rules);

  if (characters.length === 0) {
    return <p className="lcars-empty-state">Keine Charaktere vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[6px]">
      {characters.map((character) => (
        <div key={character.id} className="flex flex-col gap-[6px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            <span className="min-w-[180px] flex-1">{character.name}</span>
            <span className="stat-ap-amount">{character.available} AP</span>

            {quick.map((quick) => (
              <form key={quick.reason} action={formAction}>
                <input type="hidden" name="characterId" value={character.id} />
                <input type="hidden" name="amount" value={quick.amount} />
                <input type="hidden" name="reason" value={quick.reason} />
                <button
                  type="submit"
                  disabled={pending}
                  className="lcars-pill-btn--outline disabled:opacity-50"
                >
                  {quick.label}
                </button>
              </form>
            ))}

            <button
              type="button"
              className="lcars-pill-btn--outline"
              aria-expanded={openId === character.id}
              onClick={() =>
                setOpenId(openId === character.id ? null : character.id)
              }
            >
              Freie Buchung
            </button>
          </div>

          {openId === character.id && (
            <form
              action={formAction}
              className="flex flex-wrap items-end gap-[8px] pb-[8px]"
            >
              <input type="hidden" name="characterId" value={character.id} />
              <label className="flex flex-col gap-[4px]">
                <span className="lcars-eyebrow">AP</span>
                <input
                  name="amount"
                  type="number"
                  defaultValue={1}
                  className="lcars-input rounded-full w-[90px] text-right"
                  aria-label={`AP-Betrag für ${character.name}`}
                />
              </label>
              <label className="flex flex-col gap-[4px]">
                <span className="lcars-eyebrow">Grund</span>
                <select
                  name="reason"
                  defaultValue="manual"
                  className="lcars-input rounded-full"
                  aria-label={`Grund für ${character.name}`}
                >
                  {AWARD_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {AP_REASON_LABELS[reason]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
                <span className="lcars-eyebrow">Notiz (optional)</span>
                <input
                  name="note"
                  type="text"
                  placeholder="z.B. Session 42"
                  className="lcars-input rounded-full w-full"
                  aria-label={`Notiz für ${character.name}`}
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Buchen
              </button>
            </form>
          )}
        </div>
      ))}

      <FormError message={state?.error} />
      {state?.success && <FormSuccess>{state.success}</FormSuccess>}
    </div>
  );
}

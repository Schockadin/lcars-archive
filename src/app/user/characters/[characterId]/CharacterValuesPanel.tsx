"use client";
import { useActionState, useState } from "react";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import CharacterValuesEditor from "../_shared/CharacterValuesEditor";
import AdvancementPanel from "./AdvancementPanel";
import {
  saveCharacterStatsAction,
  type CharacterPanelState,
} from "../_shared/panelActions";
import { hasCompleteCreationValues } from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";
import type { AdvancementRules } from "@/lib/advancement";
import type { ApAccount } from "@/lib/apReasons";
import type { Talent } from "@/lib/talentCatalog";

const initialState: CharacterPanelState = {};

// Panel „Werte": oben das AP-Konto mit Erschaffungsbudget bzw. den
// Steigern-Knöpfen, darunter der Werte-Editor.
//
// Beide hängen am SELBEN Wertestand: der AP-Bereich rechnet live mit, während
// unten getippt wird (Budget, Rest-AP, Kosten des nächsten Schritts). Deshalb
// liegt der Stand hier in der Klammer-Komponente und nicht im Editor.
//
// Bewusst zwei Geschwister statt einer Verschachtelung: der AP-Bereich hat
// eigene Formulare (Steigern, Erschaffung abschließen), und ein <form> im
// <form> ist in HTML nicht erlaubt.
export default function CharacterValuesPanel({
  userId,
  characterId,
  species,
  savedStats,
  account,
  rules,
  talents,
}: {
  userId: number;
  characterId: number;
  species: string | null;
  savedStats: CharacterStats;
  account: ApAccount;
  rules: AdvancementRules;
  talents: Talent[];
}) {
  const [stats, setStats] = useState<CharacterStats>(savedStats);
  const [state, formAction, pending] = useActionState(
    saveCharacterStatsAction,
    initialState,
  );

  // Liefert der Server neue Werte (nach dem Speichern, einer Steigerung oder
  // dem Festschreiben der Erschaffung), zieht der lokale Stand nach.
  // Anpassung während des Renders, siehe React-Doku „Adjusting state when a
  // prop changes" — ein setState im Effekt löste einen zusätzlichen Render aus.
  const snapshot = JSON.stringify(savedStats);
  const [seenSnapshot, setSeenSnapshot] = useState(snapshot);
  if (snapshot !== seenSnapshot) {
    setSeenSnapshot(snapshot);
    setStats(savedStats);
  }

  return (
    <>
      <AdvancementPanel
        characterId={characterId}
        stats={stats}
        account={account}
        rules={rules}
        talents={talents}
        species={species}
        // Festgeschrieben wird der GESPEICHERTE Stand, nicht der gerade
        // getippte (siehe lockOwnCharacterCreation).
        savedComplete={hasCompleteCreationValues(savedStats)}
      />

      <form action={formAction} className="flex flex-col gap-[12px]">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="characterId" value={characterId} />
        {/* Der komplette Wertesatz als ein JSON-Feld, siehe
            characterStatsPayload.ts. */}
        <input type="hidden" name="statsJson" value={JSON.stringify(stats)} />

        <CharacterValuesEditor
          stats={stats}
          onChange={setStats}
          rules={rules}
          talents={talents}
          species={species}
          idPrefix="values-panel"
        />

        <SubmitButton
          pending={pending}
          pendingLabel="Wird gespeichert…"
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          Werte speichern
        </SubmitButton>

        <FormError message={state?.error} />
        {state?.success && (
          <p className="text-lcars-senary" role="status">
            {state.success}
          </p>
        )}
      </form>
    </>
  );
}

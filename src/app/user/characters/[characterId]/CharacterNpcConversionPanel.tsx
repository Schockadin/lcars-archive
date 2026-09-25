"use client";

import { useActionState } from "react";
import Link from "next/link";
import CharacterPanel from "./CharacterPanel";
import { FormError, SubmitButton } from "@/app/_shared/FormPrimitives";
import {
  convertCharacterToNpcAction,
  restoreCharacterFromNpcAction,
  type CharacterNpcConversionState,
} from "../_shared/npcConversionActions";

const initialState: CharacterNpcConversionState = {};

export default function CharacterNpcConversionPanel({
  characterId,
  status,
  npcSlug,
}: {
  characterId: number;
  status: "active" | "retired" | "deceased";
  npcSlug: string | null;
}) {
  const action = npcSlug
    ? restoreCharacterFromNpcAction
    : convertCharacterToNpcAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  if (!npcSlug && status === "active") return null;

  return (
    <CharacterPanel en="NPC Conversion" de="NPC-Umwandlung" defaultOpen>
      <div className="flex flex-col gap-[12px] p-[12px]">
        {npcSlug ? (
          <>
            <p className="lcars-text">
              Dieser Charakter ist als NPC geführt. Bogen, AP, Logs und
              Missionshistorie bleiben erhalten.
            </p>
            <Link
              className="lcars-pill-btn--outline self-start"
              href={`/archive/${npcSlug}`}
            >
              NPC-Eintrag ansehen
            </Link>
            <form action={formAction}>
              <input type="hidden" name="characterId" value={characterId} />
              <SubmitButton
                pending={pending}
                pendingLabel="Wird wiederhergestellt…"
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Umwandlung rückgängig machen
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="lcars-text">
              Inaktive oder verstorbene Charaktere können als NPC in der
              Datenbank weitergeführt werden. Dabei bleiben Bogen, AP, Logs und
              Missionshistorie erhalten. Die Umwandlung lässt sich jederzeit
              rückgängig machen.
            </p>
            <form action={formAction}>
              <input type="hidden" name="characterId" value={characterId} />
              <SubmitButton
                pending={pending}
                pendingLabel="Wird umgewandelt…"
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                In NPC umwandeln
              </SubmitButton>
            </form>
          </>
        )}
        {state?.success && (
          <p className="lcars-text" role="status">
            {state.success}
          </p>
        )}
        <FormError message={state?.error} />
      </div>
    </CharacterPanel>
  );
}

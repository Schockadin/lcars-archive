"use client";

import { useActionState } from "react";
import { assignCharacterAction, type AdminActionState } from "./actions";
import type { Character } from "@/types/character";

const initialState: AdminActionState = {};

export default function CharacterAssignRow({
  character,
  users,
}: {
  character: Character;
  users: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    assignCharacterAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[4px]">
      <form
        action={formAction}
        className="flex flex-wrap items-center gap-[8px]"
      >
        <input type="hidden" name="characterId" value={character.id} />
        <span className="font-lcars text-lcars-text-data">
          {character.name}
        </span>
        <select
          name="userId"
          defaultValue={character.player_id ? String(character.player_id) : ""}
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[12px] py-[4px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        >
          <option value="">— kein Spieler —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lcars-pill bg-lcars-surface-2 px-[16px] py-[4px] text-lcars-text-contrast disabled:opacity-50"
        >
          Zuweisen
        </button>
      </form>

      {state?.error && (
        <p className="text-lcars-red" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

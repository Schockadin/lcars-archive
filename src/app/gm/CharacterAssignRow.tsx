"use client";

import { useActionState } from "react";
import { assignCharacterAction, type AdminActionState } from "@/app/admin/actions";
import type { Character } from "@/types/character";
import { PlusIcon } from "@/lib/icons";

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
        <span className="font-lcars text-lcars-ink-data flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
          {character.name}
        </span>
        <select
          name="userId"
          defaultValue={character.player_id ? String(character.player_id) : ""}
          className="rounded-lcars-pill lcars-input flex-1"
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
          className="lcars-icon-btn disabled:opacity-50"
          aria-label="Zuweisen"
          title="Zuweisen"
        >
          <PlusIcon />
        </button>
      </form>

      {state?.error && (
        <p className="text-lcars-quinary" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

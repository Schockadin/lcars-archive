import CharacterAssignRow from "./CharacterAssignRow";
import type { Character } from "@/types/character";

export default function CharacterAssignmentTable({
  characters,
  users,
}: {
  characters: Character[];
  users: { id: number; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-[8px]">
      {characters.map((c) => (
        <CharacterAssignRow key={c.id} character={c} users={users} />
      ))}
    </div>
  );
}

import UserRoleRow from "./UserRoleRow";
import type { UserWithCharacters } from "@/lib/users";

export default function UserManagementTable({
  users,
}: {
  users: UserWithCharacters[];
}) {
  return (
    <div className="flex flex-col gap-[12px]">
      {users.map((u) => (
        <UserRoleRow key={u.id} user={u} />
      ))}
    </div>
  );
}

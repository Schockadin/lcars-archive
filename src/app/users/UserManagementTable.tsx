import UserRoleRow from "./UserRoleRow";
import type { UserWithCharacters } from "@/lib/users";

export default function UserManagementTable({
  users,
  isAdmin,
}: {
  users: UserWithCharacters[];
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-[12px]">
      {users.map((u) => (
        <UserRoleRow key={u.id} user={u} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

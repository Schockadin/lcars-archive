import { getCurrentUser } from "@/lib/dal";
import UsersNav from "./UsersNav";

// Gilt für /users, /users/[id] und /users/[id]/settings. Der Auth-Check
// hier ist nur für die Navigation gedacht (welche Tabs sichtbar sind) —
// die eigentliche Zugriffskontrolle bleibt in jeder Seite selbst
// (requireGM/requireSelfOrGM/requireOwnUser), siehe deren Kommentare dazu.
export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-[16px]">
      <UsersNav userId={user.id} role={user.role} />
      {children}
    </div>
  );
}

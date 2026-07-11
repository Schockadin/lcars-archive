import { requireNonGuest } from "@/lib/dal";

// Gilt für /users (Userübersicht) und /users/[id] (öffentliches Profil).
// requireNonGuest() sperrt Gast-Accounts komplett aus (siehe dal.ts) —
// admin/gm sehen auf /users zusätzlich Admin-Aktionen (siehe page.tsx),
// player/viewer bekommen dort nur die Subscribe-Aktion.
export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireNonGuest();

  return <div className="flex flex-col gap-[16px]">{children}</div>;
}

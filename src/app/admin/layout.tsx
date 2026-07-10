import { verifySession } from "@/lib/dal";

// Gilt für /admin und /admin/[id]/edit (Nutzerverwaltung/Charakter-Zuordnung).
// Dieses Layout bleibt reines Session-Gate: anonyme Besucher werden zu
// /login umgeleitet, bevor irgendeine Unterseite rendert. Sicherheitsrelevant
// ist das nicht: die tatsächliche Zugriffskontrolle (gm/admin) bleibt in
// jeder Seite selbst (requireGM/requireAdmin).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return <div className="flex flex-col gap-[16px]">{children}</div>;
}

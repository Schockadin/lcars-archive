import { verifySession } from "@/lib/dal";

// Gilt für /user (Profil + Settings zusammengeführt) und /user/content
// (eigene Inhalte, Charaktere, Missionen, Follows etc.).
// Die eigentliche Navigation zeigt jetzt der Header (HeaderUserNav) — dieses
// Layout bleibt reines Session-Gate: anonyme Besucher werden zu /login
// umgeleitet, bevor irgendeine Unterseite rendert. Sicherheitsrelevant ist
// das nicht: die tatsächliche Zugriffskontrolle bleibt in jeder Seite selbst
// (requireGM/requireOwnUser/requireOwnCharacters/requireOwnGM).
export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return <div className="flex flex-col gap-[16px]">{children}</div>;
}

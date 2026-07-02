import { verifySession } from "@/lib/dal";
import UsersNav from "./UsersNav";

// Gilt für /users, /users/[id] und /users/[id]/settings. Die Nav braucht
// nur userId + role — beides steht bereits signiert im Session-Cookie, ein
// getCurrentUser()-DB-Roundtrip wäre hier reine Verschwendung (die Seiten
// holen sich ihre eigenen, für die Anzeige nötigen Daten ohnehin selbst).
// Sicherheitsrelevant ist das nicht: die tatsächliche Zugriffskontrolle
// bleibt in jeder Seite selbst (requireGM/requireSelfOrGM/requireOwnUser),
// die für rollenbasierte Entscheidungen weiterhin frisch aus der DB prüfen
// — zeigt die Nav wegen eines veralteten Cookies fälschlich einen Tab an,
// scheitert der Klick trotzdem am echten, frischen Check dahinter.
export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  return (
    <div className="flex flex-col gap-[16px]">
      <UsersNav userId={session.userId} role={session.role} />
      {children}
    </div>
  );
}

// Gilt für /user (Profil + Settings zusammengeführt) und /user/content
// (eigene Inhalte, Charaktere, Missionen, Follows etc.).
// Die eigentliche Navigation zeigt jetzt der Header (HeaderUserNav).
//
// Das frühere reine Session-Gate (verifySession in einer Suspense-Grenze) ist
// entfallen: Anonyme Besucher werden jetzt bereits vom Proxy (src/proxy.ts)
// auf /login umgeleitet, bevor überhaupt eine Seite gerendert wird. Sicher-
// heitsrelevant war das Layout-Gate ohnehin nie — die verbindliche Zugriffs-
// kontrolle liegt weiterhin in jeder Seite selbst (requireOwnUser/
// requireOwnCharacters/requireOwnGM etc.), die ihrerseits über die DAL frisch
// aus der DB prüft (is_active, session_version, Rollen/Rechte). Damit bleibt
// hier nur noch die statische Layout-Hülle; ein cookies()-Zugriff findet nicht
// mehr statt, sodass keine eigene Suspense-Grenze mehr nötig ist.
export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-[16px]">{children}</div>;
}

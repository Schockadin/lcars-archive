// Gilt für /user (Profil + Settings zusammengeführt) und /user/content
// (eigene Inhalte, Charaktere, Missionen, Follows etc.).
// Die eigentliche Navigation zeigt jetzt der Header (HeaderUserNav).
//
// Kein Session-Gate im Layout: Die Zugriffskontrolle liegt in jeder Seite
// selbst (requireOwnUser/requireOwnCharacters/requireOwnGM etc., siehe
// ./dal.ts), die über die DAL frisch aus der DB prüft (is_active,
// session_version, Rollen/Rechte) und Anonyme auf /login umleitet. Das
// passiert innerhalb der loading.tsx-Grenze: Die statische Hülle steht
// sofort, die Umleitung kommt mit dem nachgestreamten Teil.
//
// Früher leitete zusätzlich ein Next-Proxy (src/proxy.ts, ehem. Middleware)
// Anonyme schon vor dem Rendern um. Er ist entfernt, weil Netlify ihn als
// eigene Edge Function vor JEDE Anfrage an /user, /admin und /gm schaltete —
// mit rund 2 s eigenem Kaltstart (gemessen auf Produktion und Preview), der
// sich vor den Kaltstart der Server-Function legte. Sicherheitsrelevant war
// er nie: Er prüfte nur die Cookie-Signatur, dieselbe Prüfung macht
// verifySession() in jeder Seite ohnehin.
export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-col gap-[16px]">{children}</div>;
}

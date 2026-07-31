import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import type { User, Role } from "@/types/db";
import {
  resolvePermissions,
  PERMISSION_LABELS,
  DB_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";

// React cache() dedupliziert wiederholte Aufrufe innerhalb eines
// Render-Durchlaufs (siehe Next.js-Doku zur Data Access Layer).
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const getCurrentUser = cache(async (): Promise<User> => {
  const session = await verifySession();
  const user = await getUserById(session.userId);
  if (!user) {
    // Session verweist auf einen inzwischen gelöschten User.
    redirect("/login");
  }
  // is_active wird sonst nur beim Login geprüft (siehe login/actions.ts) —
  // ohne diesen Check würde ein bereits ausgestelltes Session-Cookie eine
  // nachträglich deaktivierte Person bis zum natürlichen Ablauf (30 Tage)
  // weiterhin durch jedes DAL-Gate lassen (Deaktivieren wäre wirkungslos,
  // bis das Cookie abläuft). Das Cookie selbst wird hier NICHT gelöscht —
  // cookies().delete() ist während des Renderns nicht erlaubt, nur in
  // Server Actions/Route Handlern; der Redirect allein reicht, da jeder
  // weitere Aufruf denselben Check erneut durchläuft.
  if (!user.is_active) {
    redirect("/login");
  }
  // Passwortänderung (setPassword) erhöht session_version — ein Cookie, das
  // vor dieser Änderung ausgestellt wurde (z.B. gestohlen oder auf einem
  // anderen Gerät), trägt noch den alten Wert und wird hier verworfen,
  // statt bis zum natürlichen Ablauf (30 Tage) gültig zu bleiben. Gleiches
  // Render-Constraint wie beim is_active-Check oben: kein deleteSession()
  // hier, der Redirect allein reicht.
  if (session.sessionVersion !== user.session_version) {
    redirect("/login");
  }
  return user;
});

// Aktuelle Rollen-Map einmal pro Anfrage (React-cache-dedupliziert) — Server-
// Aufrufer, die selbst userCan/userPermissions aufrufen, holen sie hierüber und
// reichen sie explizit durch. Re-Export als bequemer Chokepoint.
export { getRoleMap } from "@/lib/roles";

// Gate für /admin (Nutzerverwaltung): darf betreten, wer gm ODER admin ist —
// die Seite selbst zeigt je nach Rolle unterschiedliche Abschnitte (siehe
// requireAdmin unten für die strengere Admin-only-Prüfung der
// Useraccount-Verwaltungs-Actions). forbidden() (nicht redirect) — der User
// ist angemeldet, nur für diese Seite nicht berechtigt (siehe
// app/forbidden.tsx).
// Granulares RBAC: effektive Rollen eines Users = Primärrolle + Zusatzrollen
// (dedupliziert), siehe src/lib/permissions.ts.
export function effectiveRoles(user: User): Role[] {
  return Array.from(new Set<Role>([user.role, ...user.additional_roles]));
}

// Effektive Rechte des aktuell eingeloggten Users (aus allen Rollen +
// Overrides). React-cache-dedupliziert pro Render, resolvt frisch aus der DB
// (nie aus dem Cookie — gleiche Begründung wie bei getCurrentUser).
export const getCurrentUserPermissions = cache(
  async (): Promise<Set<Permission>> => {
    const user = await getCurrentUser();
    const roleMap = await getRoleMap();
    return resolvePermissions(
      effectiveRoles(user),
      user.permission_overrides,
      roleMap,
    );
  },
);

// Gate: fordert genau ein Recht. forbidden() (nicht redirect) — der User ist
// angemeldet, nur für diese Aktion nicht berechtigt.
export async function requirePermission(
  permission: Permission,
): Promise<User> {
  const user = await getCurrentUser();
  const perms = await getCurrentUserPermissions();
  if (!perms.has(permission)) forbidden();
  return user;
}

// Soft-Variante von requirePermission für Server-Actions, die dem Client eine
// klare Meldung zeigen wollen. requirePermission ruft bei fehlendem Recht
// forbidden() auf — ein Auth-Interrupt (authInterrupts), der beim
// PROGRAMMATISCHEN Aufruf einer Action (kein <form action>) nur als generischer,
// NICHT über onRequestError protokollierter Fehler beim Client ankommt (leerer
// catch → nichtssagende Meldung). checkPermission wirft stattdessen nicht,
// sondern liefert bei fehlendem Recht eine beschreibende Fehlermeldung, die die
// Action als { error } zurückgeben kann; bei vorhandenem Recht kommt der User
// zurück. Für die (admin-only) Skript-Aktionen unter /admin/scripts.
export async function checkPermission(
  permission: Permission,
): Promise<{ user: User } | { error: string }> {
  const user = await getCurrentUser();
  const perms = await getCurrentUserPermissions();
  if (!perms.has(permission)) {
    const label = PERMISSION_LABELS[permission]?.label ?? permission;
    return { error: `Dir fehlt die Berechtigung „${label}“ für diese Aktion.` };
  }
  return { user };
}

// Gate: fordert mindestens EINES der Rechte.
export async function requireAnyPermission(
  permissions: Permission[],
): Promise<User> {
  const user = await getCurrentUser();
  const perms = await getCurrentUserPermissions();
  if (!permissions.some((p) => perms.has(p))) forbidden();
  return user;
}

// Rückwärtskompatible Guards, jetzt über das RBAC ausgedrückt (Signaturen
// unverändert, damit die vielen bestehenden Aufrufstellen unangetastet
// bleiben). requireGM = „darf Spielleitungs-Werkzeuge nutzen“ (gm.access),
// requireAdmin = „Verwaltung“ (admin.access), requireNonGuest = „darf die
// User-Liste sehen/abonnieren“ (users.browse).
export async function requireGM(): Promise<User> {
  return requirePermission("gm.access");
}

export async function requireAdmin(): Promise<User> {
  return requirePermission("admin.access");
}

export async function requireNonGuest(): Promise<User> {
  return requirePermission("users.browse");
}

// Baseline für den /admin-Bereich (Layout): reine Admins, reine GMs UND reine
// DB-Admins (mind. eines der DB_PERMISSIONS) dürfen den Staff-Bereich betreten;
// die Unterseiten gaten anschließend spezifisch (requireAdmin/requireGM/
// requireDbAccess bzw. feinere Rechte). Ohne die DB-Rechte hier käme ein reiner
// db-admin gar nicht erst durch das Layout-Gate zu /admin/db.
export async function requireStaff(): Promise<User> {
  return requireAnyPermission([
    "admin.access",
    "gm.access",
    ...DB_PERMISSIONS,
  ]);
}

// Gate für /admin/db: Zugang, wer mindestens EINES der DB-Rechte hat (SQL
// lesen/schreiben/löschen oder Backups). Die Seite selbst blendet die einzelnen
// Panels je nach konkretem Recht ein/aus (siehe /admin/db/page.tsx).
export async function requireDbAccess(): Promise<User> {
  return requireAnyPermission([...DB_PERMISSIONS]);
}

// Gemeinsamer Guard in den Content-Actions (Charakter/Mission/Mission-Log/
// Archiv-Eintrag/Dialog anlegen bzw. bearbeiten): das Formular führt userId
// als Hidden-Field mit — ein manipuliertes Formular mit fremder userId soll
// trotzdem nur im eigenen Namen handeln können, nie der im Formular
// mitgeschickte Wert selbst.
export function requireMatchingFormUserId(
  formData: FormData,
  session: SessionPayload,
): void {
  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect("/user");
  }
}

import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdminEditTarget } from "../dal";
import { formatDateTime } from "@/utils/formateISODate";
import { getRoleMap, getRoleLabelMap } from "@/lib/roles";
import { roleLabel } from "@/lib/permissions";
import EditUserForm from "./EditUserForm";
import PermissionsForm from "./PermissionsForm";
import UserStatusActions from "./UserStatusActions";
import type { UserAdminDetail } from "@/lib/users";

export const metadata: Metadata = {
  title: "User bearbeiten",
  robots: { index: false, follow: false },
};

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { viewer, target } = await requireAdminEditTarget(id);
  const isSelf = viewer.id === target.id;

  // Rollen sind DB-gestützt (Tabelle roles) — Auswahl/Labels/Rechte-Auflösung
  // ziehen aus der aktuellen Definition, damit eigene Rollen mit auftauchen.
  const [roleMap, roleLabels] = await Promise.all([
    getRoleMap(),
    getRoleLabelMap(),
  ]);
  const roleOptions = Object.keys(roleMap).map((key) => ({
    key,
    label: roleLabel(key, roleLabels),
  }));

  return (
    <>
      <PageMeta title={`${target.name} bearbeiten`} section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>{target.name} bearbeiten</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[6px]">
            <DetailRow label="ID" value={String(target.id)} />
            <DetailRow
              label="Rolle"
              value={roleLabel(target.role, roleLabels)}
            />
            <DetailRow
              label="Erstellt am"
              value={formatDateTime(target.created_at)}
            />
            <DetailRow
              label="Letzter Login"
              value={formatDateTime(target.last_login_at)}
            />
            <DetailRow
              label="Vorheriger Login"
              value={formatDateTime(target.previous_login_at)}
            />
            <DetailRow
              label="Letzter Seitenaufruf"
              value={formatDateTime(target.last_visit_at)}
            />
            <DetailRow label="Passwort" value={passwordStatusLabel(target)} />
            <DetailRow
              label="Charaktere"
              value={
                target.characters.length === 0 ? (
                  "Keine"
                ) : (
                  <span className="flex flex-wrap gap-[6px]">
                    {target.characters.map((c) => (
                      <Link
                        key={c.id}
                        href={`/characters/${c.slug}`}
                        className="text-lcars-primary-ink underline"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </span>
                )
              }
            />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Daten & Rollen bearbeiten</h2>
            <EditUserForm
              user={target}
              isSelf={isSelf}
              roleOptions={roleOptions}
            />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-primary-ink">Individuelle Rechte</h2>
            <PermissionsForm
              userId={target.id}
              roles={Array.from(
                new Set([target.role, ...target.additional_roles]),
              )}
              overrides={target.permission_overrides}
              roleMap={roleMap}
            />
          </section>

          <UserStatusActions user={target} isSelf={isSelf} />
        </div>
      </article>
    </>
  );
}

function passwordStatusLabel(user: UserAdminDetail): string {
  if (user.hasPassword) return "Passwort gesetzt";
  if (user.requiresActivation) {
    return "Aktivierung ausstehend (Link noch nicht benutzt)";
  }
  return "Kein Passwort gesetzt (Bestandskonto, Login nur per E-Mail)";
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-[8px]">
      <span className="lcars-eyebrow w-[160px] shrink-0">{label}</span>
      <span className="text-lcars-ink-data">{value}</span>
    </div>
  );
}

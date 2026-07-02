import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { logout } from "@/app/login/actions";
import { requireOwnUser } from "./dal";

export const metadata: Metadata = {
  title: "Mein Profil",
  robots: { index: false, follow: false },
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOwnUser(id);

  return (
    <>
      <PageMeta title="Mein Profil" section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Personendatei</p>
        <h1>Willkommen, {user.name}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Angemeldet als <strong>{user.email}</strong> ({user.role}).
          </p>

          <p>
            <Link
              href={`/users/${user.id}/settings`}
              className="text-lcars-amber underline"
            >
              Einstellungen bearbeiten
            </Link>
          </p>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lcars-pill bg-lcars-surface-2 px-[24px] py-[8px] font-lcars uppercase tracking-wide text-lcars-text-contrast"
            >
              Abmelden
            </button>
          </form>
        </div>
      </article>
    </>
  );
}

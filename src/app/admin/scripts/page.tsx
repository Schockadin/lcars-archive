import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireAdmin, getRoleMap } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import RevalidateCachePanel from "../RevalidateCachePanel";
import TimelineRegeneratePanel from "../TimelineRegeneratePanel";
import AssignOwnerlessMissionsPanel from "../AssignOwnerlessMissionsPanel";
import DialogueContentRegeneratePanel from "../DialogueContentRegeneratePanel";
import LinkAllContentPanel from "../LinkAllContentPanel";
import TypographyFixPanel from "../TypographyFixPanel";
import ToastTestPanel from "../ToastTestPanel";

export const metadata: Metadata = {
  title: "Scripts",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// Admin-only: einmalige/seltene Wartungs-Aktionen (Cache, Timeline,
// Missionen ohne Owner) — bewusst getrennt von den regelmäßigen
// User-/Charakter-/DB-Bereichen.
export default async function AdminScriptsPage() {
  await requireAdmin();
  const users = await listAllUsers();
  const roleMap = await getRoleMap();
  const gmOptions = users
    .filter((u) => userCan(u, "missions.manage", roleMap))
    .map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageMeta title="Scripts" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Scripts</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Cache</h2>
            <RevalidateCachePanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Timeline</h2>
            <TimelineRegeneratePanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Missionen ohne Owner</h2>
            <AssignOwnerlessMissionsPanel gms={gmOptions} />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Gespräche</h2>
            <DialogueContentRegeneratePanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Alle Inhalte verlinken</h2>
            <LinkAllContentPanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Typografie korrigieren</h2>
            <TypographyFixPanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Toast-Test</h2>
            <ToastTestPanel />
          </section>
        </div>
      </article>
    </>
  );
}

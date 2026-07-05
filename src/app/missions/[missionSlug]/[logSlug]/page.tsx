import { notFound } from "next/navigation";
import { getAuthorLogNav, getLogBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import { getViewer, canView } from "@/lib/visibility";
import { listAllUsers } from "@/lib/users";
import CrumbLabel from "@/components/CrumbLabel";
import LogDetail from "../../LogDetail";
import OwnerSelect from "@/components/OwnerSelect";
import AdminActionsMenu from "@/components/AdminActionsMenu";
import AutolinkButton from "@/components/AutolinkButton";
import RemoveWikilinksButton from "@/components/RemoveWikilinksButton";
import FormatTextButton from "@/components/FormatTextButton";

interface Props {
  params: Promise<{ missionSlug: string; logSlug: string }>;
}

// Erzwungen dynamisch — siehe src/app/characters/[slug]/page.tsx: der
// Sichtbarkeits-Guard unten braucht cookies(), was mit
// generateStaticParams auf dieser Route sonst zu DYNAMIC_SERVER_USAGE führt.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  const log = await getLogBySlug(logSlug);
  if (!log || log.mission_slug !== missionSlug) {
    return { title: "Nicht gefunden" };
  }
  const visible =
    log.visibility === "public" ||
    canView(log.visibility, log.ownerUserId, await getViewer());
  if (!visible) return { title: "Nicht gefunden" };

  return {
    title: `${log.title} · ${log.mission_title}`,
    description: stripHtml(log.content).slice(0, 160) || undefined,
  };
}

export default async function LogPage({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  const log = await getLogBySlug(logSlug);

  // Log muss existieren UND zur Mission im Pfad gehören (sonst 404).
  if (!log || log.mission_slug !== missionSlug) notFound();

  // Betrachter jetzt immer auflösen (nicht mehr nur bei nicht-public) — der
  // Admin-Owner-Block unten braucht die Rolle unabhängig von der
  // Sichtbarkeit dieses Logs.
  const viewer = await getViewer();
  if (
    log.visibility !== "public" &&
    !canView(log.visibility, log.ownerUserId, viewer)
  ) {
    notFound();
  }

  // Vor-/Zurück-Navigation zwischen Logs desselben Autors (sofern Autor bekannt).
  const nav = log.author_slug
    ? await getAuthorLogNav(log.author_slug, log.slug)
    : { prev: null, next: null };
  const owners = viewer?.role === "admin" ? await listAllUsers() : [];

  return (
    <>
      <CrumbLabel slug={log.slug} label={log.title} />
      {viewer?.role === "admin" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-[10px]">
          <OwnerSelect
            contentType="mission_log"
            id={log.id}
            initialOwnerId={log.ownerUserId}
            users={owners.map((u) => ({ id: u.id, name: u.name }))}
          />
          <AdminActionsMenu>
            <AutolinkButton contentType="missionLog" slug={log.slug} />
            <RemoveWikilinksButton contentType="missionLog" slug={log.slug} />
            <FormatTextButton contentType="missionLog" slug={log.slug} />
          </AdminActionsMenu>
        </div>
      )}
      <LogDetail log={log} nav={nav} />
    </>
  );
}

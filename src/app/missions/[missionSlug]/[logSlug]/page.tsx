import { notFound } from "next/navigation";
import { getAuthorLogNav, getLogBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import { getViewer, canView } from "@/lib/visibility";
import CrumbLabel from "@/components/CrumbLabel";
import LogDetail from "../../LogDetail";

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

  // Nur bei nicht-public Sichtbarkeit einen Betrachter auflösen — spart den
  // Session-/DB-Lookup im (häufigeren) public-Fall.
  if (log.visibility !== "public") {
    const viewer = await getViewer();
    if (!canView(log.visibility, log.ownerUserId, viewer)) {
      notFound();
    }
  }

  // Vor-/Zurück-Navigation zwischen Logs desselben Autors (sofern Autor bekannt).
  const nav = log.author_slug
    ? await getAuthorLogNav(log.author_slug, log.slug)
    : { prev: null, next: null };

  return (
    <>
      <CrumbLabel slug={log.slug} label={log.title} />
      <LogDetail log={log} nav={nav} />
    </>
  );
}

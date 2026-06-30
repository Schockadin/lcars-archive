import { notFound } from "next/navigation";
import {
  getAllLogPaths,
  getAuthorLogNav,
  getLogBySlug,
} from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import CrumbLabel from "@/components/CrumbLabel";
import LogDetail from "../../LogDetail";

interface Props {
  params: Promise<{ missionSlug: string; logSlug: string }>;
}

// Bekannte Mission/Log-Pfade zur Build-Zeit vorrendern. Neue werden beim ersten
// Aufruf on-demand erzeugt (dynamicParams = true ist der Default).
export async function generateStaticParams() {
  const paths = await getAllLogPaths();
  return paths.map((path) => ({
    missionSlug: path.mission_slug,
    logSlug: path.log_slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { missionSlug, logSlug } = await params;
  const log = await getLogBySlug(logSlug);
  if (!log || log.mission_slug !== missionSlug) {
    return { title: "Nicht gefunden" };
  }

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

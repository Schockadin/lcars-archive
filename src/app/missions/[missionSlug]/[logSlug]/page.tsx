import { notFound } from "next/navigation";
import { getLogBySlug } from "@/lib/missions";
import { stripHtml } from "@/lib/missionFormat";
import CrumbLabel from "@/components/CrumbLabel";
import LogDetail from "../../LogDetail";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ missionSlug: string; logSlug: string }>;
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

  return (
    <>
      <CrumbLabel slug={log.slug} label={log.title} />
      <LogDetail log={log} />
    </>
  );
}

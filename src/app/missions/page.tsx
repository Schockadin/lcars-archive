import { getAllMissions } from "@/lib/missions";
import PageMeta from "@/components/PageMeta";
import MissionsOverview from "./MissionsOverview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Missionen",
  },
};

export default async function MissionsPage() {
  const missions = await getAllMissions();
  return (
    <>
      <PageMeta title="Missionen" section="missions" />
      <MissionsOverview missions={missions} />
    </>
  );
}

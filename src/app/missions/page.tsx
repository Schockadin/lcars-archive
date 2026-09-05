import { Suspense } from "react";
import { getAllMissions } from "@/lib/missions";
import PageMeta from "@/components/PageMeta";
import MissionsOverview from "./MissionsOverview";
import CampaignBookLink from "./CampaignBookLink";

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
      <MissionsOverview
        missions={missions}
        // Der Knopf hängt am angemeldeten Konto und liegt deshalb in einer
        // eigenen Suspense-Grenze — die Liste selbst bleibt prerenderbar.
        campaignBook={
          <Suspense fallback={null}>
            <CampaignBookLink />
          </Suspense>
        }
      />
    </>
  );
}

import { getAllTimelineEvents } from "@/lib/timeline";
import PageMeta from "@/components/PageMeta";
import TimelineView from "./TimelineView";

export const metadata = {
  title: {
    default: "Timeline",
  },
};

export default async function TimelinePage() {
  const events = await getAllTimelineEvents();
  return (
    <>
      <PageMeta title="Timeline" section="timeline" />
      <TimelineView events={events} />
    </>
  );
}

import { getStoryGraph } from "@/lib/storyGraph";
import PageMeta from "@/components/PageMeta";
import StoryGraph from "./StoryGraph";

export const metadata = {
  title: {
    default: "Timeline",
  },
};

// Timeline als interaktiver Story-Graph: Charaktere, Missionen und
// Archiv-Einträge als Knoten, ihre internen Verlinkungen als Kanten. Der
// Jahr-Regler oben blendet die Geschichte kumulativ ein (siehe StoryGraph.tsx /
// storyGraph.ts).
export default async function TimelinePage() {
  const graph = await getStoryGraph();
  return (
    <>
      <PageMeta title="Timeline" section="timeline" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <div className="mb-[12px]">
          <h1 className="lcars-data-row-heading">Timeline</h1>
          <p className="lcars-eyebrow">
            Story-Graph · interne Verlinkungen · kumulativ nach Jahr
          </p>
        </div>
        <StoryGraph graph={graph} />
      </article>
    </>
  );
}

import LcarsStatChip from "./LcarsStatChip";
import { getHeaderStats } from "@/lib/stats";

export default async function StatChipBar() {
  const stats = await getHeaderStats();
  const { characterCount, sessionCount, entryCount, lastSession } = stats;
  return (
    <div className="flex items-end gap-[8px] mb-[4px] overflow-hidden">
      <LcarsStatChip
        withBorder={false}
        label="Kampagnenjahre"
        value={15}
        color="var(--lcars-amber)"
      />
      <LcarsStatChip
        withBorder={true}
        label="Charaktere"
        value={characterCount}
        color="var(--lcars-blue)"
      />
      <LcarsStatChip
        withBorder={true}
        label="Missionen"
        value={sessionCount}
        color="var(--lcars-purple)"
      />
      <LcarsStatChip
        withBorder={true}
        label="Archiv Einträge"
        value={entryCount}
        color="var(--lcars-red)"
      />
      <div
        style={{
          width: "1px",
          height: "44px",
          background: "var(--lcars-amber)",
          flexShrink: 0,
          opacity: 0.75,
        }}
      />
    </div>
  );
}

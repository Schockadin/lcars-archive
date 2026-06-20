import { getHeaderStats } from "@/lib/stats";
import { formatISODate } from "@/utils/formateISODate";
import LcarsStatChip from "./LcarsStatChip";
import LcarsContextTag from "./LcarsContextTag";
import { ContextSep } from "./LcarsContextTag";

export default async function LcarsHeader() {
  const stats = await getHeaderStats();
  const { characterCount, sessionCount, entryCount, lastSession } = stats;
  return (
    <header
      className="w-full h-[var(--lcars-header-h)]"
      style={{
        position: "sticky",
        top: "0px",
        marginLeft: "calc(-1 * var(--lcars-elbow-size))",
        width: "calc(100% + var(--lcars-elbow-size))",
      }}
    >
      {/* Header Content */}
      <div className="flex flex-col h-full flex-1 min-w-0 bg-[var(--lcars-blue)]">
        <div className="lcars-header-content">
          <div className="flex flex-col justify-between items-end pl-[10px] pt-[10px] h-full">
            <div className="lcars-eyebrow">
              INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
            </div>
            <div className="lcars-header-title uppercase mb-[4px]">
              Neo Archiv
            </div>
            <div className="flex items-end gap-[8px] mb-[4px]">
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
                label="Archiv"
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
          </div>
        </div>
      </div>
    </header>
  );
}

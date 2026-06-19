import { getHeaderStats } from "@/lib/stats";
import { formatISODate } from "@/utils/formateISODate";
import LcarsStatChip from "./LcarsStatChip";
import LcarsContextTag from "./LcarsContextTag";
import { ContextSep } from "./LcarsContextTag";

export default async function LcarsHeaderBox() {
  const stats = await getHeaderStats();
  const { characterCount, sessionCount, entryCount, lastSession } = stats;

  const MOCK_SESSION: typeof lastSession = {
    sessionNr: 1,
    title: "Tanghal IV",
    authorName: "Desmond Hobbes",
    logDate: "12.03.2240",
  };

  return (
    <div className="flex flex-col items-end gap-[10px] mb-[5px]">
      {/* ── Zeile 1: Heading / Nav ── */}

      {/* ── Zeile 2: Stat-Chips + Timestamp ── */}
      <div className="flex items-end gap-[12px]">
        {/* Stat-Chips */}
        <div className="flex items-end gap-[8px]">
          {/* Kampagnenalter (hard coded) */}
          <LcarsStatChip
            label="Kampagnenjahre"
            value={15}
            color="var(--lcars-amber)"
          />
          <LcarsStatChip
            label="Charaktere"
            value={characterCount}
            color="var(--lcars-blue)"
          />
          <LcarsStatChip
            label="Missionen"
            value={sessionCount}
            color="var(--lcars-purple)"
          />
          <LcarsStatChip
            label="Archiv"
            value={entryCount}
            color="var(--lcars-red)"
          />
          {/* Trennstrich */}
          <LcarsStatChip
            label="System"
            value={"STA 2e"}
            color="var(--lcars-blue)"
          />
          <LcarsStatChip
            label="Status"
            value={"aktiv"}
            color="var(--lcars-purple)"
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

      {/* ── Divider ── */}
      <div
        style={{
          width: "100%",
          height: "2px",
          background: `linear-gradient(to left, var(--lcars-blue), 75%, transparent)`,
          opacity: 0.75,
        }}
      />
      {/* ── Zeile 3: Aktiver Kontext ── */}
      {MOCK_SESSION && (
        <div className="flex items-center gap-[16px]">
          {/* Pulsierender Punkt */}
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--lcars-blue)",
              boxShadow: "0 0 6px var(--lcars-blue)",
              flexShrink: 0,
              animation: "lcars-pulse 2s ease-in-out infinite",
            }}
          />

          <LcarsContextTag
            label="Letzter Eintrag"
            value={`Session ${MOCK_SESSION.sessionNr ?? "—"}`}
          />
          <ContextSep />
          {MOCK_SESSION.authorName && (
            <>
              <LcarsContextTag
                label="Erzähler"
                value={MOCK_SESSION.authorName}
              />
              <ContextSep />
            </>
          )}
          {MOCK_SESSION.logDate && (
            <LcarsContextTag
              label="Datum"
              value={formatISODate(MOCK_SESSION.logDate)}
            />
          )}
        </div>
      )}
    </div>
  );
}

"use client";

const LABELS = ["Aufrufe", "Anmeldungen"] as const;

export default function StatsChart({
  daily,
}: {
  daily: { date: string; views: number; signups: number }[];
}) {
  const maximum = Math.max(
    1,
    ...daily.flatMap((day) => [day.views, day.signups]),
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <ul className="flex flex-wrap gap-[16px] text-[12px] text-lcars-ink-dim">
        {LABELS.map((label, index) => (
          <li key={label} className="flex items-center gap-[6px]">
            <span
              aria-hidden="true"
              className={`inline-block size-[10px] rounded-full ${index === 0 ? "bg-lcars-primary" : "bg-lcars-tertiary"}`}
            />
            {label}
          </li>
        ))}
      </ul>

      <div
        role="img"
        aria-label="Balkendiagramm mit täglichen Inhaltsaufrufen und Neuanmeldungen"
        className="grid grid-cols-7 gap-[8px]"
      >
        {daily.map((day) => {
          const label = new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
            "de-DE",
            { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" },
          );
          return (
            <div
              key={day.date}
              className="flex min-w-0 flex-col items-center gap-[6px]"
              title={`${label}: ${day.views} Aufrufe, ${day.signups} Anmeldungen`}
            >
              <div className="flex h-[112px] w-full items-end justify-center gap-[3px] border-b border-lcars-border px-[2px]">
                <span
                  aria-hidden="true"
                  className="w-[min(34%,18px)] rounded-t-[4px] bg-lcars-primary"
                  style={{ height: `${Math.max(day.views > 0 ? 3 : 0, (day.views / maximum) * 100)}%` }}
                />
                <span
                  aria-hidden="true"
                  className="w-[min(34%,18px)] rounded-t-[4px] bg-lcars-tertiary"
                  style={{ height: `${Math.max(day.signups > 0 ? 3 : 0, (day.signups / maximum) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-lcars-ink-dim">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

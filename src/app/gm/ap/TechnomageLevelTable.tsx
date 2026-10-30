import {
  TECHNOMAGE_AP_THRESHOLDS,
} from "@/lib/technomageSpellRules";

export default function TechnomageLevelTable() {
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-sm text-lcars-ink-dim">
        Die Techno-Mage-Stufe folgt den kumulativen D20-Erfahrungsschwellen,
        umgerechnet mit 150 XP je vergebenem AP. Maßgeblich sind alle erhaltenen
        AP; ausgegebene AP senken die Stufe nicht. Bei 40 AP ist die Figur Stufe 4.
      </p>
      <div className="grid grid-cols-2 gap-x-[16px] gap-y-[4px] sm:grid-cols-4 lg:grid-cols-5">
        {TECHNOMAGE_AP_THRESHOLDS.map((ap, index) => (
          <div
            key={index}
            className="flex items-baseline justify-between gap-[8px] border-b border-[var(--lcars-ink-dim)]/20 py-[4px] text-sm"
          >
            <strong>Stufe {index + 1}</strong>
            <span>{ap} AP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

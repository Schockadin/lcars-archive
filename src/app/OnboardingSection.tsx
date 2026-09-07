import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { getOnboardingSteps } from "@/lib/onboarding";
import { onboardingProgress } from "@/lib/onboardingSteps";

// „Erste Schritte" auf dem Dashboard — dieselbe Liste wie auf /willkommen,
// solange noch etwas offen ist. Ist alles erledigt, verschwindet die Box: sie
// hat dann nichts mehr zu sagen, und das Dashboard ist für die tägliche
// Nutzung da, nicht für den Einstieg.
export default async function OnboardingSection({
  userId,
}: {
  userId: number;
}) {
  const steps = await getOnboardingSteps(userId);
  const progress = onboardingProgress(steps);
  if (progress.complete) return null;

  return (
    <LcarsDataRow value={progress.total - progress.done} label="Erste Schritte">
      <div className="lcars-text flex flex-col gap-[16px]">
        <OnboardingChecklist steps={steps} />
        <p>
          <Link href="/willkommen" className="underline">
            Zur Einstiegsseite
          </Link>
        </p>
      </div>
    </LcarsDataRow>
  );
}

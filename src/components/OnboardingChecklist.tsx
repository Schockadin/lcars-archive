import Link from "next/link";
import {
  onboardingProgress,
  type OnboardingStep,
} from "@/lib/onboardingSteps";

// Die Einstiegs-Liste: je Schritt ein Haken, was zu tun ist und ein Link
// dorthin. Wird zweimal gerendert — auf /willkommen und (eingeklappt) auf dem
// Dashboard —, deshalb eine eigene Komponente statt zweier Fassungen.
//
// Der Haken ist bewusst ein Textzeichen mit eigener Beschriftung für
// Screenreader und keine Checkbox: hier gibt es nichts zu bedienen, der
// Zustand ergibt sich aus den Daten (siehe onboardingSteps.ts).
export default function OnboardingChecklist({
  steps,
}: {
  steps: OnboardingStep[];
}) {
  const progress = onboardingProgress(steps);

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="lcars-eyebrow">
        {progress.done} von {progress.total} Schritten erledigt
      </p>

      <ol className="flex flex-col gap-[12px]">
        {steps.map((step) => (
          <li key={step.id} className="flex flex-col gap-[2px]">
            <span className="flex items-baseline gap-[8px]">
              <span
                aria-hidden="true"
                className={
                  step.done
                    ? "text-lcars-tertiary-ink"
                    : "text-lcars-ink-dim"
                }
              >
                {step.done ? "✓" : "○"}
              </span>
              <strong>{step.label}</strong>
              <span className="sr-only">
                {step.done ? " (erledigt)" : " (offen)"}
              </span>
            </span>
            <span className="text-lcars-ink-dim">{step.hint}</span>
            {!step.done && (
              <Link href={step.href} className="underline">
                {step.linkLabel}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

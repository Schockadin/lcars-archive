"use client";

import { FormError } from "@/app/_shared/FormPrimitives";
import { useOptimisticAdminSelect } from "@/hooks/useOptimisticAdminSelect";
import LcarsSwitch from "@/components/lcars/Switch";

export type ContentState = "draft" | "published";

const OPTIONS: { key: ContentState; label: string }[] = [
  { key: "draft", label: "Entwurf" },
  { key: "published", label: "Veröffentlicht" },
];

// Presentational + optimistic core shared by the owner list and moderation
// detail pages. Authorization remains in their respective Server Actions.
export default function ContentStateSwitch({
  isDraft,
  action,
  onPublished,
  ariaLabel,
  ariaLabelledBy,
  className = "",
  errorPresentation = "inline",
}: {
  isDraft: boolean;
  action: (next: ContentState) => Promise<{ error?: string }>;
  onPublished?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  errorPresentation?: "inline" | "toast";
}) {
  const { value, pending, error, change } =
    useOptimisticAdminSelect<ContentState>(
      isDraft ? "draft" : "published",
      async (next) => {
        if (next === "published") onPublished?.();
        return action(next);
      },
    );

  return (
    <div className={className}>
      <div role="group" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
        <LcarsSwitch
          className="content-state-switch"
          itemClassName="lcars-switch-item"
          options={OPTIONS.map((option) => ({
            ...option,
            disabled: pending,
          }))}
          active={value}
          onChange={change}
        />
      </div>
      {errorPresentation === "toast" ? (
        <FormError message={error ?? undefined} />
      ) : (
        error && (
          <p className="text-lcars-quinary-ink text-[11px]" role="alert">
            {error}
          </p>
        )
      )}
    </div>
  );
}

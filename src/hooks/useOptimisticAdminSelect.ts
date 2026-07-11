"use client";
import { useOptimistic, useState, useTransition } from "react";

// Gemeinsames Muster für admin-only Inline-Selects auf den Inhalts-
// Detailseiten (OwnerSelect.tsx, AdminVisibilitySelect.tsx): optimistischer
// Wert (useOptimistic statt useState — automatischer Rollback, falls die
// Server Action fehlschlägt und die Seite beim nächsten Datenabruf denselben
// Wert wie vorher zeigt), Pending-State fürs Deaktivieren des <select>
// während der Transition, lokaler Error-State für eine Inline-Fehlermeldung.
export function useOptimisticAdminSelect<T>(
  initialValue: T,
  action: (next: T) => Promise<{ error?: string }>,
) {
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: T) {
    setError(null);
    startTransition(async () => {
      setOptimisticValue(next);
      const result = await action(next);
      if (result.error) setError(result.error);
    });
  }

  return { value: optimisticValue, pending, error, change };
}

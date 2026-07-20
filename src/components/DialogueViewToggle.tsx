"use client";
import { useTransition } from "react";
import Switch from "./lcars/Switch";
import { setDialogueViewPreferenceAction } from "@/app/actions/dialogues";

type ViewMode = "flowing" | "cards";

// Nur auf abgeschlossenen Dialogen mit vorhandenem Fließtext sichtbar (siehe
// ArchiveEntryBody.tsx) — wechselt zwischen dem generierten Fließtext
// (archive_entries.content/source_md) und der Karten-Ansicht wie bei
// offenen Dialogen. Die Wahl ist eine globale User-Präferenz (gilt für
// jeden abgeschlossenen Dialog, nicht nur diesen), deshalb kein optimistic-
// Rollback-Bedarf wie bei den Owner-/Sichtbarkeits-Selects — ein
// fehlschlagender Schreibversuch betrifft nur die nächste Ansicht, revalidatePath
// aktualisiert die aktuelle Seite ohnehin nach jedem erfolgreichen Wechsel.
export default function DialogueViewToggle({
  entrySlug,
  flowingTextEnabled,
}: {
  entrySlug: string;
  flowingTextEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const active: ViewMode = flowingTextEnabled ? "flowing" : "cards";

  function handleChange(mode: ViewMode) {
    if (mode === active || pending) return;
    startTransition(async () => {
      await setDialogueViewPreferenceAction(mode === "flowing", entrySlug);
    });
  }

  return (
    <Switch
      className="my-[5px]"
      active={active}
      onChange={handleChange}
      options={[
        { key: "flowing", label: "Fließtext", disabled: pending },
        { key: "cards", label: "Karten-Ansicht", disabled: pending },
      ]}
    />
  );
}

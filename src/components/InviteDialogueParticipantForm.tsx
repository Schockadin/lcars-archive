"use client";
import { useState, useTransition } from "react";
import { FormField, FormError } from "@/app/_shared/FormPrimitives";
import { inviteDialogueParticipantAction } from "@/app/actions/dialogues";

// Charaktere UND NPC-Datenbank-Einträge in einer Liste — identifiziert über
// den Sprecher-Schlüssel ("c12"/"n7", siehe src/lib/dialogueSpeaker.ts),
// damit die IDs beider Quellen nicht kollidieren.
export interface InviteCandidate {
  key: string;
  name: string;
  playerName: string;
}

// Nur für den Owner sichtbar (siehe /dialogues/[slug]/page.tsx — Owner ist,
// wer den Dialog begonnen hat, siehe createDialogue). Direkt-Hinzufügen
// jederzeit möglich, auch in einem bereits laufenden Dialog, kein
// Annehmen/Ablehnen — die neu Eingeladenen bekommen nur eine Info-Mail
// (inviteDialogueParticipantAction). candidates enthält bereits nur
// Charaktere, die noch NICHT teilnehmen (Filterung serverseitig in
// page.tsx, gleiches Muster wie bei MissionParticipantsField).
export default function InviteDialogueParticipantForm({
  entrySlug,
  candidates,
}: {
  entrySlug: string;
  candidates: InviteCandidate[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  if (candidates.length === 0) return null;

  function handleInvite() {
    if (selectedKeys.length === 0) return;
    setError(undefined);
    setSuccess(false);
    startTransition(async () => {
      const result = await inviteDialogueParticipantAction(
        entrySlug,
        selectedKeys,
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setSelectedKeys([]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-[8px] mt-[12px]">
      <FormField
        label="Weitere Personen einladen"
        htmlFor="dlg-invite-participants"
        hint="Mehrfachauswahl per Strg/Cmd- oder Shift-Klick. Direkt hinzugefügt, kein Annehmen/Ablehnen nötig — die eingeladene Person bekommt eine Info-Mail."
      >
        <select
          id="dlg-invite-participants"
          multiple
          size={Math.min(6, candidates.length)}
          value={selectedKeys}
          onChange={(e) =>
            setSelectedKeys(
              Array.from(e.currentTarget.selectedOptions).map((o) => o.value),
            )
          }
          className="lcars-input rounded-lcars-pill w-full h-auto py-[8px]"
        >
          {candidates.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name} ({c.playerName})
            </option>
          ))}
        </select>
      </FormField>

      <button
        type="button"
        onClick={handleInvite}
        disabled={pending || selectedKeys.length === 0}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Wird eingeladen…" : "Einladen"}
      </button>

      <FormError message={error} />
      {success && (
        <p className="text-lcars-senary" role="status">
          Eingeladen.
        </p>
      )}
    </div>
  );
}

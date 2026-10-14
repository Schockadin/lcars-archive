"use client";
import { useState, useTransition } from "react";
import { FormField, FormError } from "@/app/_shared/FormPrimitives";
import { inviteDialogueParticipantAction } from "@/app/actions/dialogues";
import type { GmContact } from "@/lib/users";

// Charaktere UND NPC-Datenbank-Einträge in einer Liste — identifiziert über
// den Sprecher-Schlüssel ("c12"/"n7", siehe src/lib/dialogueSpeaker.ts),
// damit die IDs beider Quellen nicht kollidieren.
export interface InviteCandidate {
  key: string;
  name: string;
  playerName: string;
  kind: "character" | "npc";
  isActive: boolean;
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Nur für den Owner sichtbar (siehe /dialogues/[slug]/page.tsx — Owner ist,
// wer den Dialog begonnen hat, siehe createDialogue). Direkt-Hinzufügen
// jederzeit möglich, auch in einem bereits laufenden Dialog, kein
// Annehmen/Ablehnen — die neu Eingeladenen bekommen nur eine Info-Mail
// (inviteDialogueParticipantAction). candidates enthält bereits nur
// Charaktere, die noch NICHT teilnehmen (Filterung serverseitig in
// page.tsx, gleiches Muster wie bei MissionParticipantsField).
//
// NPCs stehen dabei allen offen, nicht nur der Spielleitung — dieselbe Regel
// wie beim Anlegen eines Gesprächs. Wer sie nicht selbst spielt, benennt eine
// Spielleitung, die für sie schreibt; steht für dieses Gespräch schon eine
// fest, entfällt die Frage (npcSpeakerUserId). Verbindlich geprüft wird das
// ohnehin in der Action.
export default function InviteDialogueParticipantForm({
  entrySlug,
  candidates,
  gms,
  inviterPlaysNpcs,
  npcSpeakerUserId,
}: {
  entrySlug: string;
  candidates: InviteCandidate[];
  // Auswahl „wer spielt die NPCs?" — leer, wenn die einladende Person sie
  // selbst spielt (dann ist sie es).
  gms: GmContact[];
  inviterPlaysNpcs: boolean;
  // Wer in diesem Gespräch bereits für NPCs schreibt, falls schon jemand.
  npcSpeakerUserId: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [chosenGmId, setChosenGmId] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");

  if (candidates.length === 0) return null;

  const normalizedSearch = normalizeSearchText(search.trim());
  const matchesSearch = (candidate: InviteCandidate) =>
    normalizedSearch.length === 0 ||
    normalizeSearchText(
      candidate.name +
        " " +
        candidate.playerName +
        " " +
        (candidate.kind === "npc" ? "NPC" : "Charakter"),
    ).includes(normalizedSearch);
  const groups = [
    {
      label: "Charaktere (aktiv)",
      candidates: candidates.filter(
        (candidate) =>
          candidate.kind === "character" &&
          candidate.isActive &&
          matchesSearch(candidate),
      ),
    },
    {
      label: "NPCs (aktiv)",
      candidates: candidates.filter(
        (candidate) =>
          candidate.kind === "npc" &&
          candidate.isActive &&
          matchesSearch(candidate),
      ),
    },
    {
      label: "Charaktere (inaktiv/tot/missing)",
      candidates: candidates.filter(
        (candidate) =>
          candidate.kind === "character" &&
          !candidate.isActive &&
          matchesSearch(candidate),
      ),
    },
    {
      label: "NPCs (inaktiv/tot/missing)",
      candidates: candidates.filter(
        (candidate) =>
          candidate.kind === "npc" &&
          !candidate.isActive &&
          matchesSearch(candidate),
      ),
    },
  ].map((group) => ({
    ...group,
    candidates: group.candidates.sort(
      (a, b) =>
        a.name.localeCompare(b.name, "de", { sensitivity: "base" }) ||
        a.playerName.localeCompare(b.playerName, "de", {
          sensitivity: "base",
        }),
    ),
  }));
  const visibleCandidates = groups.flatMap((group) => group.candidates);
  const selectedCandidates = selectedKeys
    .map((key) => candidates.find((candidate) => candidate.key === key))
    .filter((candidate): candidate is InviteCandidate => candidate !== undefined);

  // Ist ein NPC ausgewählt? Entscheidet, ob nach der Spielleitung gefragt
  // wird — wie im Anlege-Formular am Präfix des Sprecher-Schlüssels erkannt.
  const npcSelected = selectedKeys.some((key) => key.startsWith("n"));
  const needsGm = npcSelected && !inviterPlaysNpcs && npcSpeakerUserId === null;
  // Bei genau einer Spielleitung gibt es nichts zu wählen — sie wird still
  // mitgeschickt (die Action setzt sie auch ohne Feld, das Feld hält die
  // Anzeige nur ehrlich).
  const needsGmChoice = needsGm && gms.length > 1;

  function handleInvite() {
    if (selectedKeys.length === 0) return;
    setError(undefined);
    setSuccess(false);
    startTransition(async () => {
      const result = await inviteDialogueParticipantAction(
        entrySlug,
        selectedKeys,
        chosenGmId,
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setSelectedKeys([]);
        setChosenGmId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-[8px] mt-[12px]">
      <FormField
        label="Weitere Personen einladen"
        htmlFor="dlg-invite-participants"
        hint="Suche nach Namen oder Spielernamen. Mehrfachauswahl per Strg/Cmd- oder Shift-Klick. Direkt hinzugefügt, kein Annehmen/Ablehnen nötig — die eingeladene Person bekommt eine Info-Mail. NPCs schreibt die Spielleitung."
      >
        <input
          id="dlg-invite-participant-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Personen suchen…"
          aria-label="Personen suchen"
          className="lcars-input rounded-lcars-pill w-full mb-[8px]"
        />
        <select
          id="dlg-invite-participants"
          multiple
          size={Math.min(8, Math.max(4, visibleCandidates.length))}
          value={selectedKeys}
          onChange={(event) => {
            const visibleKeys = new Set(
              visibleCandidates.map((candidate) => candidate.key),
            );
            const selectedHiddenKeys = selectedKeys.filter(
              (key) => !visibleKeys.has(key),
            );
            const selectedVisibleKeys = Array.from(
              event.currentTarget.selectedOptions,
            ).map((option) => option.value);
            setSelectedKeys([...selectedHiddenKeys, ...selectedVisibleKeys]);
          }}
          className="lcars-input rounded-lcars-pill w-full h-auto py-[8px]"
        >
          {groups.map(
            (group) =>
              group.candidates.length > 0 && (
                <optgroup key={group.label} label={group.label}>
                  {group.candidates.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {candidate.name} ({candidate.playerName})
                    </option>
                  ))}
                </optgroup>
              ),
          )}
        </select>
        {visibleCandidates.length === 0 && (
          <p className="lcars-text text-[13px] mt-[6px]">
            Keine passenden Personen.
          </p>
        )}
        {selectedCandidates.length > 0 && (
          <p className="lcars-text text-[13px] mt-[6px]" aria-live="polite">
            Ausgewählt:{" "}
            {selectedCandidates
              .map(
                (candidate) =>
                  candidate.name + " (" + candidate.playerName + ")",
              )
              .join(", ")}
          </p>
        )}
      </FormField>

      {/* Wer schreibt für die NPCs? Nur wenn welche ausgewählt sind, die
          einladende Person sie nicht selbst spielt und für dieses Gespräch
          noch keine Spielleitung zuständig ist. */}
      {needsGm && (
        <FormField
          label="Spielleitung für die NPCs"
          htmlFor="dlg-invite-npc-speaker"
          hint="Diese Person schreibt in diesem Gespräch für die beteiligten NPCs."
        >
          {needsGmChoice ? (
            <select
              id="dlg-invite-npc-speaker"
              value={chosenGmId ?? ""}
              onChange={(e) => setChosenGmId(Number(e.currentTarget.value))}
              className="lcars-input rounded-lcars-pill"
            >
              <option value="">Bitte wählen</option>
              {gms.map((gm) => (
                <option key={gm.id} value={gm.id}>
                  {gm.name}
                </option>
              ))}
            </select>
          ) : (
            // Genau eine Spielleitung (oder gar keine): nichts zu wählen. Das
            // Feld zeigt nur, wer es sein wird; die Action setzt sie selbst.
            <input
              id="dlg-invite-npc-speaker"
              type="text"
              readOnly
              value={gms[0]?.name ?? "Keine Spielleitung verfügbar"}
              className="lcars-input rounded-lcars-pill"
            />
          )}
        </FormField>
      )}

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
        <p className="text-lcars-senary-ink" role="status">
          Eingeladen.
        </p>
      )}
    </div>
  );
}

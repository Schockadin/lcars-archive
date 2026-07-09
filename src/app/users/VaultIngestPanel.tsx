"use client";
import { useState } from "react";
import {
  ingestVaultCharactersAction,
  ingestVaultMissionsAction,
  ingestVaultArchiveAction,
  finalizeVaultIngestAction,
} from "./vaultIngestActions";

const PHASE_LABELS = ["Charaktere", "Missionen", "Archiv", "Abschluss"];

// Admin-only (siehe page.tsx) — Gegenstück zu VaultExportPanel: importiert
// neue Markdown-Dateien aus dem Vault-Repo in die DB (entspricht
// `npm run db:ingest:new`, nur direkt aus der laufenden App und ohne
// lokalen Vault-Checkout). Bestehende Inhalte werden dabei nie überschrieben
// — das schützt Bearbeitungen, die seither in der App gemacht wurden.
//
// Läuft clientseitig orchestriert in vier Phasen (Charaktere → Missionen →
// Archiv → Abschluss), jede ein eigener Server-Aufruf — ein einzelner
// Aufruf über den kompletten Vault reißt bei größeren Datenmengen leicht
// die Netlify-Function-Timeout-Grenze, wodurch die Verbindung ergebnislos
// abbricht und auch kein Konsolen-Output mehr ankommt. Der Log wird
// deshalb nach jeder Phase ergänzt und bleibt sichtbar, selbst wenn eine
// spätere Phase fehlschlägt.
export default function VaultIngestPanel() {
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setRunning(true);
    setError(null);
    setLog([]);
    setPhaseIndex(0);

    const charactersResult = await ingestVaultCharactersAction();
    setLog((prev) => [...prev, ...(charactersResult.log ?? [])]);
    if (charactersResult.error) {
      setError(charactersResult.error);
      setRunning(false);
      return;
    }

    setPhaseIndex(1);
    const missionsResult = await ingestVaultMissionsAction();
    setLog((prev) => [...prev, ...(missionsResult.log ?? [])]);
    if (missionsResult.error) {
      setError(missionsResult.error);
      setRunning(false);
      return;
    }

    setPhaseIndex(2);
    const archiveResult = await ingestVaultArchiveAction();
    setLog((prev) => [...prev, ...(archiveResult.log ?? [])]);
    if (archiveResult.error) {
      setError(archiveResult.error);
      setRunning(false);
      return;
    }

    setPhaseIndex(3);
    const finalizeResult = await finalizeVaultIngestAction({
      changedMissionSlugs: missionsResult.changedMissionSlugs ?? [],
      changedCharacterSlugs: missionsResult.changedCharacterSlugs ?? [],
      newLogSlugs: missionsResult.newLogSlugs ?? [],
      changedArchiveSlugs: archiveResult.changedArchiveSlugs ?? [],
    });
    setLog((prev) => [...prev, ...(finalizeResult.log ?? [])]);
    if (finalizeResult.error) {
      setError(finalizeResult.error);
    }

    setPhaseIndex(null);
    setRunning(false);
  }

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-text-dim text-[13px]">
        Importiert Markdown-Dateien aus dem Vault-Repo, deren Slug noch nicht in
        der Datenbank existiert. Bestehende Inhalte werden nicht überschrieben —
        Bearbeitungen in der App bleiben also unangetastet.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={running}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {running
          ? `Ingest läuft (${PHASE_LABELS[phaseIndex ?? 0]}…)`
          : "Vault ingesten"}
      </button>

      {error && (
        <p className="text-lcars-red" role="alert">
          {error}
        </p>
      )}

      {log.length > 0 && (
        <textarea
          readOnly
          value={log.join("\n")}
          className="rounded-lcars-pill lcars-input min-h-[240px] resize-y font-mono text-[12px]"
        />
      )}
    </div>
  );
}

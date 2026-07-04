"use server";
import { requireAdmin } from "@/lib/dal";
import {
  ingestVaultCharactersPhase,
  ingestVaultMissionsPhase,
  ingestVaultArchivePhase,
  finalizeVaultIngestPhase,
  type VaultIngestFinalizeInput,
} from "@/lib/vaultIngest";

// Vier separate Admin-Panel-Auslöser statt einer einzelnen Action — jede
// Phase lädt nur ihren Teil des Vaults und läuft als eigener Server-Aufruf
// (siehe vaultIngest.ts für die Begründung: Netlify-Function-Timeout bei
// einem einzelnen Aufruf über den ganzen Vault). VaultIngestPanel.tsx ruft
// alle vier nacheinander auf und reicht die changed*-Slugs aus den
// Missions-/Archiv-Phasen an die Abschluss-Phase weiter.

export interface CharactersPhaseState {
  log?: string[];
  error?: string;
}

export async function ingestVaultCharactersAction(): Promise<CharactersPhaseState> {
  await requireAdmin();
  try {
    return await ingestVaultCharactersPhase();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Charaktere: ${err.message}`
          : "Charaktere: Ingest fehlgeschlagen.",
    };
  }
}

export interface MissionsPhaseState {
  log?: string[];
  changedMissionSlugs?: string[];
  changedCharacterSlugs?: string[];
  newLogSlugs?: string[];
  error?: string;
}

export async function ingestVaultMissionsAction(): Promise<MissionsPhaseState> {
  await requireAdmin();
  try {
    return await ingestVaultMissionsPhase();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Missionen: ${err.message}`
          : "Missionen: Ingest fehlgeschlagen.",
    };
  }
}

export interface ArchivePhaseState {
  log?: string[];
  changedArchiveSlugs?: string[];
  error?: string;
}

export async function ingestVaultArchiveAction(): Promise<ArchivePhaseState> {
  await requireAdmin();
  try {
    return await ingestVaultArchivePhase();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Archiv: ${err.message}`
          : "Archiv: Ingest fehlgeschlagen.",
    };
  }
}

export interface FinalizePhaseState {
  log?: string[];
  error?: string;
}

export async function finalizeVaultIngestAction(
  input: VaultIngestFinalizeInput,
): Promise<FinalizePhaseState> {
  await requireAdmin();
  try {
    return await finalizeVaultIngestPhase(input);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Abschluss: ${err.message}`
          : "Abschluss: fehlgeschlagen.",
    };
  }
}

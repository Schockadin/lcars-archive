import "server-only";
import { hasPassword } from "@/lib/users";
import { getCharactersForUser, getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { parseCharacterStats } from "@/lib/characterStats";
import {
  buildOnboardingSteps,
  type OnboardingStep,
} from "@/lib/onboardingSteps";

// Die Tatsachen hinter den Einstiegs-Schritten (siehe onboardingSteps.ts für
// die Schritte selbst). Kein Cache: alles hängt am angemeldeten Konto, und die
// Abfragen darunter sind aus demselben Grund ungecacht.
//
// Bewusst OHNE eigene Tabelle für den Fortschritt: jeder Schritt lässt sich an
// den vorhandenen Daten ablesen — siehe die Begründung in onboardingSteps.ts.
export async function getOnboardingSteps(
  userId: number,
): Promise<OnboardingStep[]> {
  const [passwordSet, characters, logs, dialogues] = await Promise.all([
    hasPassword(userId),
    getCharactersForUser(userId),
    getLogsForUser(userId),
    // "all" statt "open": ein abgeschlossenes Gespräch zählt genauso — der
    // Schritt fragt, ob die Person schon einmal eines geführt hat.
    getDialoguesForUser(userId, "all"),
  ]);

  return buildOnboardingSteps({
    hasPassword: passwordSet,
    characterCount: characters.length,
    lockedCharacterCount: characters.filter(
      // metadata.stats ist rohes JSON — über denselben Parser lesen wie die
      // eigene Charakterübersicht, statt hier auf die Form zu vertrauen.
      (character) => parseCharacterStats(character.metadata.stats).creationLocked,
    ).length,
    logCount: logs.length,
    dialogueCount: dialogues.length,
  });
}

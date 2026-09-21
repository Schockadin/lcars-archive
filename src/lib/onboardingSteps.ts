// Die Schritte des Einstiegs für neue Spielerinnen und Spieler — als reine
// Funktion über ein paar Tatsachen zum Konto, damit sie ohne Datenbank
// prüfbar ist (siehe onboardingSteps.test.ts). Die Tatsachen selbst holt
// src/lib/onboarding.ts.
//
// Bewusst KEINE eigene Fortschritts-Tabelle: jeder Schritt lässt sich an dem
// ablesen, was ohnehin in der Datenbank steht. Eine zweite Wahrheit („Schritt
// als erledigt markiert“) könnte auseinanderlaufen — etwa wenn jemand seinen
// Charakter wieder löscht.
//
// „Ein Gespräch beginnen" stand hier einmal als fünfter Schritt und ist
// wieder entfallen: Er hängt anders als die übrigen nicht am eigenen Konto
// allein, sondern an einem Gegenüber, das mitspielen muss — ein Einstieg
// sollte sich allein erledigen lassen.

export type OnboardingStepId =
  | "passwort"
  | "charakter"
  | "erschaffung"
  | "logbuch";

export interface OnboardingFacts {
  hasPassword: boolean;
  characterCount: number;
  // Wie viele der eigenen Charaktere ihre Erschaffung abgeschlossen haben
  // (stats.creationLocked).
  lockedCharacterCount: number;
  logCount: number;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  // Was in dem Schritt zu tun ist, in einem Satz.
  hint: string;
  href: string;
  linkLabel: string;
  done: boolean;
}

export function buildOnboardingSteps(
  facts: OnboardingFacts,
): OnboardingStep[] {
  const hasCharacter = facts.characterCount > 0;

  return [
    {
      id: "passwort",
      label: "Passwort festlegen",
      hint: "Ohne eigenes Passwort kommst du nur über den Aktivierungslink herein.",
      href: "/user#password",
      linkLabel: "Zum Passwort",
      done: facts.hasPassword,
    },
    {
      id: "charakter",
      label: "Charakter anlegen",
      hint: "Der Assistent führt dich in vier Schritten durch Stammdaten, Werte, Talente und Biografie.",
      href: "/user/characters/new",
      linkLabel: "Charakter anlegen",
      done: hasCharacter,
    },
    {
      id: "erschaffung",
      label: "Erschaffung abschließen",
      hint: "Erst danach zählen Steigerungen gegen deine Erfahrungspunkte statt gegen die Erschaffungsbudgets.",
      // Ohne Charakter gibt es keine Erschaffung zum Abschließen — der Link
      // führt dann dorthin, wo der Charakter entsteht.
      href: hasCharacter ? "/user/characters" : "/user/characters/new",
      linkLabel: hasCharacter ? "Zu meinen Charakteren" : "Charakter anlegen",
      done: facts.lockedCharacterCount > 0,
    },
    {
      id: "logbuch",
      label: "Erstes Logbuch schreiben",
      hint: "Dein Bericht zu einer Mission — aus Sicht deiner Figur, in deinen Worten.",
      href: "/user/mission-logs/new",
      linkLabel: "Logbuch schreiben",
      done: facts.logCount > 0,
    },
  ];
}

export function onboardingProgress(steps: OnboardingStep[]): {
  done: number;
  total: number;
  complete: boolean;
} {
  const done = steps.filter((step) => step.done).length;
  return { done, total: steps.length, complete: done === steps.length };
}

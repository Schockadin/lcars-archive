// Woher stammt der Code, der gerade läuft? — App-Version plus Netlifys
// Build-Metadaten (Kontext, Branch, Commit). Gebraucht vom Fehler-Log
// (src/lib/errorLog.ts): Ein Eintrag ohne diese Angabe sagt nur, DASS etwas
// kaputt war, nicht WELCHER Build es geworfen hat.
//
// Das ist keine Kür: Netlify hält jeden früheren Deploy dauerhaft unter
// seinem Permalink erreichbar und jede Deploy-Preview unter
// deploy-preview-<nr>--<projekt>.netlify.app. Diese alten Lambdas sprechen
// mit DERSELBEN Live-Datenbank. Ein Aufruf von außen (alter Lesezeichen-Link,
// Crawler) lässt dort Code laufen, der Monate alt sein kann — und dessen
// Fehler landen ununterscheidbar neben den echten im selben error_logs.
// Genau so entstanden die „column \"visibility\" does not exist"-Einträge auf
// „/": Sie kamen aus Builds von vor v1.34.3, als getDBStats() noch auf die
// inzwischen entfernte Spalte filterte.
//
// Bewusst OHNE "server-only" und ohne DB-Import: reine Daten-Aufbereitung,
// damit sie unter Vitest prüfbar bleibt (wie dbTables.ts, colorMode.ts …).
import { APP_VERSION } from "./version";

export interface BuildEnv {
  // Netlify CONTEXT: production | deploy-preview | branch-deploy | dev
  context?: string;
  branch?: string;
  commit?: string;
  // REVIEW_ID — die PR-Nummer, aber nur bei Deploy-Previews gesetzt.
  reviewId?: string;
}

export interface DeployOrigin {
  appVersion: string;
  deployContext: string | null;
  commitRef: string | null;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Eine Zeile, die im Fehler-Log auf einen Blick sagt, welches Deployment das
// war: „production", „deploy-preview #78", „branch-deploy (mein-branch)".
// Lokal (keine der Variablen gesetzt) bleibt es null statt einer erfundenen
// Angabe.
export function formatDeployContext(env: BuildEnv): string | null {
  const context = clean(env.context);
  const branch = clean(env.branch);
  const reviewId = clean(env.reviewId);
  if (context === "deploy-preview")
    return reviewId ? `deploy-preview #${reviewId}` : "deploy-preview";
  if (context === "branch-deploy")
    return branch ? `branch-deploy (${branch})` : "branch-deploy";
  if (context) return context;
  return branch ? `branch (${branch})` : null;
}

// Die kurze Commit-Form, wie sie auch git log zeigt — die vollen 40 Zeichen
// helfen in einer Tabellenzelle niemandem.
export function shortCommitRef(commit: string | undefined): string | null {
  const value = clean(commit);
  return value ? value.slice(0, 7) : null;
}

export function describeDeployOrigin(
  env: BuildEnv,
  appVersion: string,
): DeployOrigin {
  return {
    appVersion,
    deployContext: formatDeployContext(env),
    commitRef: shortCommitRef(env.commit),
  };
}

// Die Werte des laufenden Builds. NEO_BUILD_* wird in next.config.ts zur
// BUILD-Zeit aus Netlifys Variablen eingesetzt (env-Feld, siehe dort): Die
// Metadaten beschreiben den Build, nicht die Anfrage — zur Laufzeit in der
// Function sind sie nicht verlässlich gesetzt. Der Fallback auf die
// Laufzeit-Variablen bleibt trotzdem stehen, falls die Plattform sie doch
// mitgibt.
//
// Die process.env.NEO_BUILD_*-Zugriffe müssen wörtlich so dastehen: Next
// ersetzt genau diese Ausdrücke beim Build durch ihren Wert, ein
// destrukturiertes process.env bekäme nichts.
export function currentDeployOrigin(): DeployOrigin {
  return describeDeployOrigin(
    {
      context: process.env.NEO_BUILD_CONTEXT || process.env.CONTEXT,
      branch: process.env.NEO_BUILD_BRANCH || process.env.BRANCH,
      commit: process.env.NEO_BUILD_COMMIT || process.env.COMMIT_REF,
      reviewId: process.env.NEO_BUILD_REVIEW_ID || process.env.REVIEW_ID,
    },
    APP_VERSION,
  );
}

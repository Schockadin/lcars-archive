// src/lib/version.ts
//
// Beta-Versionsschema: 0.<PR-Nr>.<Commit-Nr> — solange die App in der
// Beta-/Testphase ist, bleibt die Major-Version auf 0.
//
// PR-Nr:
//   - Deploy-Preview-Build (Netlify): kommt direkt aus REVIEW_ID, das
//     Netlify für jeden PR-Preview-Build automatisch setzt.
//   - Production-Build (nach einem Merge, kein PR-Branch mehr vorhanden):
//     aus der Commit-Message des letzten Commits extrahiert — GitHub hängt
//     bei Squash-Merges "(#NN)" an den Titel an, bei regulären Merges gibt
//     es "Merge pull request #NN …" (beide Muster kommen in der Historie
//     dieses Repos vor).
//
// Commit-Nr:
//   - Deploy-Preview-Build: Anzahl Commits auf dem PR-Branch seit der
//     Abzweigung von master (git rev-list --count origin/master..HEAD) —
//     zählt bei jedem Push im PR hoch (0.27.1, 0.27.2, …) und beginnt bei
//     einem neuen PR wieder bei 1.
//   - Production-Build: kein PR-Branch mehr vorhanden (0 Commits "ahead"),
//     daher Fallback auf die Gesamt-Commit-Anzahl im Repo
//     (git rev-list --count HEAD).
//
// Wird einmalig beim Build ausgewertet (Footer ist Teil des statischen
// Layouts) und als Modul-Konstante zwischengespeichert. Schlägt die
// Ermittlung fehl (z.B. kein .git-Verzeichnis, lokaler `next dev` ohne
// Historie), bleibt APP_VERSION `null` und die Anzeige wird ausgeblendet,
// statt den Build zum Absturz zu bringen.
import { execSync } from "node:child_process";
import {
  FIRST_COMMIT_NUMBER,
  FIRST_PR_NUMBER,
  VERSION_PREFIX,
} from "./constants";

function git(cmd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function resolvePrNumber(): number | null {
  const reviewId = process.env.REVIEW_ID;
  if (reviewId && /^\d+$/.test(reviewId)) return Number(reviewId);

  const subject = git("git log -1 --pretty=%s");
  if (!subject) return null;
  const squashMatch = subject.match(/\(#(\d+)\)\s*$/);
  if (squashMatch) return Number(squashMatch[1]);
  const mergeMatch = subject.match(/Merge pull request #(\d+)/);
  if (mergeMatch) return Number(mergeMatch[1]);
  return null;
}

function resolveCommitNumber(): number | null {
  const aheadOfMaster = git("git rev-list --count origin/master..HEAD");
  if (
    aheadOfMaster &&
    /^\d+$/.test(aheadOfMaster) &&
    Number(aheadOfMaster) > 0
  ) {
    return Number(aheadOfMaster);
  }
  const total = git("git rev-list --count HEAD");
  if (total && /^\d+$/.test(total)) return Number(total);
  return null;
}

export const APP_VERSION: string | null = (() => {
  const pr = (resolvePrNumber() || 0) - FIRST_PR_NUMBER;
  const commit = (resolveCommitNumber() || 0) - FIRST_COMMIT_NUMBER;
  if (pr == null || commit == null) return null;
  return `${VERSION_PREFIX}.${pr}.${commit}`;
})();

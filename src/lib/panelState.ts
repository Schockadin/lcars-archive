// Ob ein aufklappbarer Abschnitt offen oder zu ist — je Gerät gemerkt
// (localStorage), damit die Startseite und das Profil beim nächsten Besuch so
// aussehen, wie man sie verlassen hat.
//
// Bewusst im localStorage und NICHT am Konto (gleiche Überlegung wie bei
// REPLY_DOCK_STICKY_KEY in src/lib/replyDockPreference.ts): Das ist eine
// Entscheidung über das Layout des jeweiligen Geräts — am Telefon will man
// die lange News-Liste vielleicht zugeklappt haben, am großen Schirm nicht.
// Dazu kommt: eine Spalte in `users` verlangt eine Migration gegen dieselbe
// Datenbank, an der auch die Deploy-Preview hängt — für eine Anzeige-Vorliebe
// unverhältnismäßig.
//
// Gespeichert wird nur die ABWEICHUNG von der Vorgabe: Wer nichts anfasst,
// hat keinen Eintrag, und eine später geänderte Vorgabe erreicht ihn auch.
// Dasselbe Prinzip wie bei den Dashboard-Sektionen selbst (siehe
// src/lib/dashboardSections.ts).

export const PANEL_OPEN_PREFIX = "neo:panel:";

export function panelStorageKey(id: string): string {
  return `${PANEL_OPEN_PREFIX}${id}`;
}

// Der gemerkte Zustand — oder null, wenn es keinen gibt (dann gilt die
// Vorgabe des Abschnitts). Privates Fenster, gesperrte Websitedaten, SSR: In
// all diesen Fällen gibt es keinen Speicher, und null ist die richtige
// Antwort.
export function readPanelOpen(id: string): boolean | null {
  try {
    const value = window.localStorage.getItem(panelStorageKey(id));
    if (value === "1") return true;
    if (value === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writePanelOpen(id: string, open: boolean): void {
  try {
    window.localStorage.setItem(panelStorageKey(id), open ? "1" : "0");
  } catch {}
}

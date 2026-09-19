// Soll das Antwortfeld offener Gespräche am unteren Rand kleben
// (.dialogue-reply-dock, siehe archive.css)? Steuerbar über die Checkbox im
// Kasten selbst.
//
// Bewusst im localStorage und NICHT am Konto (wie etwa
// editor_spellcheck_enabled): Das ist eine Entscheidung über das Layout des
// jeweiligen Geräts — auf dem Telefon nimmt der Kasten spürbar Platz weg, am
// großen Schirm kaum. Wer ihn am Telefon loshaben will, will ihn deshalb
// nicht zwangsläufig auch am Rechner loshaben. Dazu kommt: eine Spalte in
// `users` verlangt eine Migration gegen dieselbe Datenbank, an der auch die
// Deploy-Preview hängt — für eine Anzeige-Vorliebe unverhältnismäßig.
//
// Vorgabe ist „angeheftet": Das ist das Verhalten, das diese Version bringt;
// der Haken ist die Ausnahme, nicht die Einschaltung.
export const REPLY_DOCK_STICKY_KEY = "neo:dialogue-reply-sticky";

export function readReplyDockSticky(): boolean {
  // Privates Fenster, gesperrte Websitedaten, SSR: In all diesen Fällen gibt
  // es keinen Speicher — dann gilt die Vorgabe.
  try {
    return window.localStorage.getItem(REPLY_DOCK_STICKY_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeReplyDockSticky(sticky: boolean): void {
  try {
    window.localStorage.setItem(REPLY_DOCK_STICKY_KEY, sticky ? "1" : "0");
  } catch {}
}

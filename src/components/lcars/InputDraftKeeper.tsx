"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  applyFieldValue,
  clearDraftRecord,
  draftFieldKeys,
  isDraftableField,
  isFieldAtDefault,
  readDraftRecord,
  readFieldValue,
  withDraftValue,
  withKnownDraftValue,
  writeDraftRecord,
  type DraftField,
  type DraftRecord,
} from "@/lib/inputDraft";

// Globale Entwurfs-Sicherung für ALLE Eingabefelder der App: Jede Eingabe
// wandert mitsamt ihrem Feld in den Sitzungsspeicher (sessionStorage) und wird
// beim nächsten Aufbau derselben Seite wieder eingesetzt. Ein Reload, ein
// Fehlerbildschirm oder ein versehentliches Zurück kostet damit keinen Text
// mehr.
//
// Bewusst EINE Stelle im Layout statt einer Änderung an ~80 Formularen: die
// Sicherung hängt an document (Event-Delegation) und kennt die Felder nur über
// das DOM. Neue Formulare (Fenster, Akkordeons, nachgeladene Bereiche) sind
// deshalb automatisch dabei — ein MutationObserver setzt auch dort den
// gesicherten Stand ein, sobald sie erscheinen.
//
// Die Regeln (welches Feld, welcher Schlüssel, welcher Wert) liegen in
// src/lib/inputDraft.ts; hier steht nur die Verdrahtung. Nicht gesichert
// werden Passwörter, Einmalcodes und Zahlungsdaten sowie alles unterhalb von
// data-no-draft.
//
// Der Speicher ist sessionStorage, nicht localStorage: Entwürfe gehören zur
// laufenden Sitzung dieses einen Tabs und verschwinden mit ihm — sie sollen
// nicht auf unbestimmte Zeit auf dem Gerät liegen bleiben.

// Schreibvorgänge bündeln: Tippen löst je Zeichen ein input-Event aus, der
// Sitzungsspeicher braucht aber nicht jedes Zeichen einzeln zu sehen.
const WRITE_DEBOUNCE_MS = 300;

// Ein einmaliges Einsetzen genügt NICHT, sobald ein Feld einen vom Server
// gerenderten Vorgabewert hat (defaultValue) — also bei jedem Bearbeiten-
// Formular und jedem Markdown-Editor. React hydriert die Seite nach unserem
// Durchgang und schreibt dabei den Vorgabewert zurück; der Entwurf war
// gesichert, aber sofort wieder überschrieben. Deshalb wird der Stand nach dem
// Aufbau eine kurze Zeit lang „angeheftet": mehrere Durchgänge, die ein Feld
// so lange nachziehen, bis die Person es selbst anfasst. Danach gilt wieder
// „einmal einsetzen, dann in Ruhe lassen" — die App soll ihre eigenen Felder
// steuern dürfen.
const PIN_WINDOW_MS = 1500;
const PIN_INTERVAL_MS = 150;

export const INPUT_DRAFT_DROP_EVENT = "neo:input-draft-drop";

// Den gesicherten Stand der AKTUELLEN Seite verwerfen — aufrufbar von
// überall, ohne an den Sitzungsspeicher zu müssen.
//
// Gebraucht, wenn der Server den Text ABSICHTLICH ersetzt hat: Beim
// Wiederherstellen einer früheren Fassung (RevisionsPanel.tsx) beschreibt der
// Entwurf einen Stand, den es gerade nicht mehr geben soll — ohne dieses
// Verwerfen legte die Sicherung ihn beim nächsten Aufbau wieder über den
// wiederhergestellten Text, und ein anschließendes Speichern schriebe ihn
// sogar zurück in die Datenbank.
//
// Als Ereignis statt als direkter Aufruf von clearDraftRecord(): Die
// Sicherung hält denselben Stand zusätzlich im Arbeitsspeicher (recordRef)
// und schreibt ihn beim Verlassen der Seite zurück (pagehide → snapshot).
// Ein Löschen an ihr vorbei wäre damit beim nächsten Seitenwechsel wieder
// rückgängig gemacht.
export function dropInputDraftsForPage(): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new Event(INPUT_DRAFT_DROP_EVENT));
}

export default function InputDraftKeeper() {
  const pathname = usePathname();
  // Bei einer clientseitigen Navigation bleibt diese Layout-Komponente
  // erhalten. Der neue Pfad wird deshalb schon im Commit gesetzt, während
  // Observer/Timer des alten Effects noch bis zu dessen Cleanup laufen
  // können. Die Ref stoppt sie sofort, bevor sie Felder der neuen Seite mit
  // dem Datensatz der alten Seite befüllen. Ein Layout-Effect läuft dabei vor
  // MutationObserver-Callbacks aus demselben DOM-Umbau.
  const currentPathRef = useRef(pathname);
  useLayoutEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);
  // Der zuletzt geschriebene Stand, damit nicht bei jedem Zeichen aus dem
  // Speicher gelesen (und geparst) werden muss.
  const recordRef = useRef<DraftRecord>({});
  // Während des Wiederherstellens lösen wir selbst input/change aus — die
  // dürfen nicht als Nutzereingabe zurückgeschrieben werden.
  const restoringRef = useRef(false);

  useEffect(() => {
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      // Privater Modus / gesperrte Websitedaten: ohne Speicher gibt es eben
      // keine Entwürfe. Die Seite funktioniert unverändert weiter.
      return;
    }

    const path = pathname ?? window.location.pathname;
    const isCurrentPage = () => currentPathRef.current === pathname;
    recordRef.current = readDraftRecord(storage, path);

    // Schlüssel je Feld zwischenspeichern: das Ermitteln läuft über das
    // gesamte Formular und soll nicht an jedem Tastendruck hängen. Bei jeder
    // DOM-Änderung wird der Cache verworfen (Felder können dazukommen).
    let keyCache = new WeakMap<Element, string>();
    // Schon einmal befüllte Felder nicht erneut überschreiben — sonst würde
    // der Observer eine spätere Nutzereingabe wieder auf den Entwurf
    // zurücksetzen.
    const restored = new WeakSet<Element>();
    // Vom Menschen angefasste Felder. Während der Anheft-Phase ist das die
    // Grenze: Ein angefasstes Feld gehört der Person, nicht dem Entwurf.
    // Unsere eigenen Ereignisse zählen nicht (restoringRef schützt onInput).
    const touched = new WeakSet<Element>();

    const keyFor = (el: DraftField): string | null => {
      const cached = keyCache.get(el);
      if (cached) return cached;
      const keys = draftFieldKeys(el.form ?? document);
      for (const [field, key] of keys) keyCache.set(field, key);
      return keys.get(el) ?? null;
    };

    let writeTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (writeTimer) {
        clearTimeout(writeTimer);
        writeTimer = null;
      }
      writeDraftRecord(storage, path, recordRef.current);
    };
    const scheduleWrite = () => {
      if (writeTimer) return;
      writeTimer = setTimeout(() => {
        writeTimer = null;
        writeDraftRecord(storage, path, recordRef.current);
      }, WRITE_DEBOUNCE_MS);
    };

    // Den Stand eines Feldes in den Datensatz übernehmen — ohne Aussage
    // darüber, WER ihn verursacht hat.
    const recordValue = (el: DraftField) => {
      const key = keyFor(el);
      if (!key) return;
      const next = withDraftValue(recordRef.current, key, readFieldValue(el));
      if (next === recordRef.current) return;
      recordRef.current = next;
      scheduleWrite();
    };

    // Eine Eingabe von Hand: Ab jetzt gehört das Feld der Person, das Anheften
    // lässt es in Ruhe.
    const remember = (el: DraftField) => {
      touched.add(el);
      recordValue(el);
    };

    const onInput = (event: Event) => {
      if (!isCurrentPage()) return;
      if (restoringRef.current) return;
      const target = event.target as Element | null;
      if (!isDraftableField(target)) return;
      remember(target);
    };

    // Nach dem Wiederherstellen eines Feldes ist sein Wert bereits gesichert —
    // hier geht es nur darum, Felder zu füllen, die es beim letzten Durchgang
    // noch nicht gab.
    // Der allererste Durchgang nach dem Aufbau: Dort — und nur dort — gilt ein
    // Feld, das schon vom Vorgabewert abweicht, als angefasst (siehe unten).
    let firstPass = true;

    const restore = (pinning: boolean) => {
      if (!isCurrentPage()) return;
      const record = recordRef.current;
      // Ohne gesicherten Stand gibt es nichts einzusetzen — und damit auch
      // keinen Grund, das Dokument abzusuchen. Das ist der Normalfall (jede
      // Seite, auf der noch nichts getippt wurde), und er soll den
      // MutationObserver unten praktisch nichts kosten: Die Schlüssel fürs
      // Speichern holt keyFor() ohnehin erst beim ersten Tastendruck.
      //
      // Der erste Durchgang läuft trotzdem: Er übernimmt, was vor dem Zuhören
      // schon getippt wurde (siehe unten).
      if (!firstPass && Object.keys(record).length === 0) return;
      const keys = draftFieldKeys(document);
      restoringRef.current = true;
      try {
        for (const [el, key] of keys) {
          keyCache.set(el, key);
          const firstTime = !restored.has(el);
          restored.add(el);
          // Wer schneller tippt, als die Seite fertig wird, hat seinen Text
          // schon im Feld, bevor diese Sicherung überhaupt zuhört. Er ist der
          // jüngere Stand: nicht überschreiben, sondern übernehmen — und zwar
          // OHNE das Feld als angefasst zu markieren, denn die Hydration steht
          // ja noch bevor. Angeheftet wird dann dieser übernommene Stand.
          if (firstTime && !isFieldAtDefault(el)) {
            recordValue(el);
            continue;
          }
          // Nach der Anheft-Phase jedes Feld nur einmal; in ihr so lange, bis
          // es angefasst wurde (siehe PIN_WINDOW_MS oben).
          if (!firstTime && !pinning) continue;
          if (touched.has(el)) continue;
          const value = record[key];
          if (value) applyFieldValue(el, value);
        }
      } finally {
        restoringRef.current = false;
        firstPass = false;
      }
    };

    // Ein Formular, das zurückgesetzt wird (nach erfolgreichem Absenden ruft
    // z.B. DialogueReplyForm form.reset() auf), hat keinen Entwurf mehr — der
    // abgeschickte Text darf beim nächsten Aufbau nicht wieder auftauchen.
    const onReset = (event: Event) => {
      if (!isCurrentPage()) return;
      const form = event.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;
      // Sofort, nicht im nächsten Tick: Formulare, die sich nach dem Absenden
      // per neuem key neu aufbauen (z.B. der Notiz-Editor), lösen dabei einen
      // Durchgang des MutationObservers aus. Läge das Vergessen dahinter,
      // gewänne das Rennen mal der eine, mal der andere — und der eben
      // abgeschickte Text stünde wieder im frischen Feld. Gelesen werden hier
      // ohnehin nur die Schlüssel, nicht die Werte.
      const next = { ...recordRef.current };
      let changed = false;
      for (const key of draftFieldKeys(form).values()) {
        if (key in next) {
          delete next[key];
          changed = true;
        }
      }
      if (changed) {
        recordRef.current = next;
        flush();
      }
    };

    // Vor dem Verlassen/Verstecken der Seite den tatsächlichen Stand der
    // bereits gesicherten Felder nachführen. Das deckt den Fall ab, dass React
    // ein Formular nach einer erfolgreichen Server-Action selbst geleert hat
    // (ohne reset-Event): gesichert wird dann das leere Feld, nicht der
    // abgeschickte Text.
    //
    // Ausdrücklich nur BEKANNTE Felder (withKnownDraftValue): Ein
    // Bearbeiten-Formular, das jemand nur geöffnet und dann in einen anderen
    // Tab gewechselt hat, darf seine serverseitigen Vorgabewerte nicht
    // sichern — sie lägen beim nächsten Aufruf über inzwischen geänderte
    // Inhalte, ohne dass je jemand etwas getippt hätte.
    const snapshot = () => {
      if (!isCurrentPage()) return;
      let record = recordRef.current;
      // Ist nichts gesichert, gibt es auch nichts nachzuführen — der
      // Dokument-Durchgang bleibt dann aus. Geschrieben wird trotzdem: flush()
      // holt einen noch ausstehenden gebündelten Stand nach, und genau darauf
      // kommt es beim Verlassen der Seite an.
      if (Object.keys(record).length > 0) {
        for (const [el, key] of draftFieldKeys(document))
          record = withKnownDraftValue(record, key, readFieldValue(el));
        recordRef.current = record;
      }
      flush();
    };

    // Siehe dropInputDraftsForPage() oben: Der Stand dieser Seite ist
    // überholt — im Speicher UND im Arbeitsspeicher.
    const onDrop = () => {
      if (!isCurrentPage()) return;
      recordRef.current = {};
      clearDraftRecord(storage, path);
    };

    const onPageHide = () => snapshot();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") snapshot();
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("reset", onReset, true);
    document.addEventListener(INPUT_DRAFT_DROP_EVENT, onDrop);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Der Aufbau der Seite — und damit die Hydration, gegen die angeheftet
    // wird (siehe PIN_WINDOW_MS oben).
    let pinUntil = 0;
    let pinTimer: ReturnType<typeof setInterval> | null = null;
    const startPinning = () => {
      pinUntil = Date.now() + PIN_WINDOW_MS;
      restore(true);
      if (pinTimer) return;
      pinTimer = setInterval(() => {
        if (Date.now() > pinUntil) {
          clearInterval(pinTimer as ReturnType<typeof setInterval>);
          pinTimer = null;
          return;
        }
        restore(true);
      }, PIN_INTERVAL_MS);
    };

    startPinning();

    // Nachgeladene Formulare (Fenster, Akkordeons, Live-Ansichten) ebenfalls
    // füllen — auch sie werden angeheftet: Ein per Suspense nachgestreamter
    // Bereich hydriert erst, wenn er da ist. Gebündelt über einen
    // Microtask-Timer, damit ein Renderdurchlauf mit vielen Knoten nur einen
    // Durchgang auslöst.
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver((mutations) => {
      // Die Positions-Ausweichschlüssel (Felder ohne name/id) hängen an der
      // Reihenfolge im Dokument — jede Änderung kann sie verschieben.
      keyCache = new WeakMap<Element, string>();
      // Nur ein hinzugekommenes ELEMENT kann ein neues Feld mitbringen.
      // Live-Ansichten (Gesprächs-Poll, Toasts, Zähler) tauschen fortlaufend
      // Textknoten aus; ohne diese Prüfung liefe für jeden davon ein
      // vollständiger Dokument-Durchgang.
      const addedElement = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) => node.nodeType === Node.ELEMENT_NODE,
        ),
      );
      if (!addedElement) return;
      if (restoreTimer) return;
      restoreTimer = setTimeout(() => {
        restoreTimer = null;
        startPinning();
      }, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (restoreTimer) clearTimeout(restoreTimer);
      if (pinTimer) clearInterval(pinTimer);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("reset", onReset, true);
      document.removeEventListener(INPUT_DRAFT_DROP_EVENT, onDrop);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [pathname]);

  return null;
}

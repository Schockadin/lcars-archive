"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  applyFieldValue,
  draftFieldKeys,
  isDraftableField,
  readDraftRecord,
  readFieldValue,
  withDraftValue,
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

export default function InputDraftKeeper() {
  const pathname = usePathname();
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
    recordRef.current = readDraftRecord(storage, path);

    // Schlüssel je Feld zwischenspeichern: das Ermitteln läuft über das
    // gesamte Formular und soll nicht an jedem Tastendruck hängen. Bei jeder
    // DOM-Änderung wird der Cache verworfen (Felder können dazukommen).
    let keyCache = new WeakMap<Element, string>();
    // Schon einmal befüllte Felder nicht erneut überschreiben — sonst würde
    // der Observer eine spätere Nutzereingabe wieder auf den Entwurf
    // zurücksetzen.
    const restored = new WeakSet<Element>();

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

    const remember = (el: DraftField) => {
      const key = keyFor(el);
      if (!key) return;
      const next = withDraftValue(recordRef.current, key, readFieldValue(el));
      if (next === recordRef.current) return;
      recordRef.current = next;
      scheduleWrite();
    };

    const onInput = (event: Event) => {
      if (restoringRef.current) return;
      const target = event.target as Element | null;
      if (!isDraftableField(target)) return;
      remember(target);
    };

    // Nach dem Wiederherstellen eines Feldes ist sein Wert bereits gesichert —
    // hier geht es nur darum, Felder zu füllen, die es beim letzten Durchgang
    // noch nicht gab.
    const restore = () => {
      const record = recordRef.current;
      // Ohne gesicherten Stand gibt es nichts einzusetzen — und damit auch
      // keinen Grund, das Dokument abzusuchen. Das ist der Normalfall (jede
      // Seite, auf der noch nichts getippt wurde), und er soll den
      // MutationObserver unten praktisch nichts kosten: Die Schlüssel fürs
      // Speichern holt keyFor() ohnehin erst beim ersten Tastendruck.
      if (Object.keys(record).length === 0) return;
      const keys = draftFieldKeys(document);
      restoringRef.current = true;
      try {
        for (const [el, key] of keys) {
          keyCache.set(el, key);
          if (restored.has(el)) continue;
          restored.add(el);
          const value = record[key];
          if (value) applyFieldValue(el, value);
        }
      } finally {
        restoringRef.current = false;
      }
    };

    // Ein Formular, das zurückgesetzt wird (nach erfolgreichem Absenden ruft
    // z.B. DialogueReplyForm form.reset() auf), hat keinen Entwurf mehr — der
    // abgeschickte Text darf beim nächsten Aufbau nicht wieder auftauchen.
    const onReset = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;
      const keys = draftFieldKeys(form);
      // Erst im nächsten Tick: bis dahin stehen die Vorgabewerte im Formular.
      setTimeout(() => {
        const next = { ...recordRef.current };
        let changed = false;
        for (const key of keys.values()) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        }
        if (changed) {
          recordRef.current = next;
          flush();
        }
      }, 0);
    };

    // Vor dem Verlassen/Verstecken der Seite den tatsächlichen Stand aller
    // Felder festhalten. Das deckt den Fall ab, dass React ein Formular nach
    // einer erfolgreichen Server-Action selbst geleert hat (ohne reset-Event):
    // gesichert wird dann das leere Feld, nicht der abgeschickte Text.
    const snapshot = () => {
      let record = recordRef.current;
      for (const [el, key] of draftFieldKeys(document))
        record = withDraftValue(record, key, readFieldValue(el));
      recordRef.current = record;
      flush();
    };

    const onPageHide = () => snapshot();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") snapshot();
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("reset", onReset, true);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    restore();

    // Nachgeladene Formulare (Fenster, Akkordeons, Live-Ansichten) ebenfalls
    // füllen. Gebündelt über einen Microtask-Timer, damit ein Renderdurchlauf
    // mit vielen Knoten nur einen Durchgang auslöst.
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
        restore();
      }, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (restoreTimer) clearTimeout(restoreTimer);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("reset", onReset, true);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [pathname]);

  return null;
}

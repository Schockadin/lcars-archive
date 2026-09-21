"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { readPanelOpen, writePanelOpen } from "@/lib/panelState";

// Ein aufklappbarer Abschnitt, der sich merkt, wie man ihn verlassen hat.
//
// Trägt die Startseite (src/app/Dashboard.tsx) und das Profil (/user). Dort
// standen vorher DataRow-Akkordeons: die breiten, farbigen LCARS-Balken mit
// der Zahl links. Die sind als Navigationszeile gedacht — eine Seite aus
// zehn davon liest sich wie ein Inhaltsverzeichnis, nicht wie ein
// Arbeitsplatz. Hier steht jetzt dieselbe schlanke Klappe wie in den
// Darstellungs-Einstellungen (SettingsPanel), und die Zahl steht als
// Kurzinfo rechts weiter da.
//
// Drei Unterschiede zu SettingsPanel, und deshalb eine eigene Komponente:
// dieser Abschnitt ist per Vorgabe OFFEN, er merkt sich seinen Zustand je
// Gerät (siehe src/lib/panelState.ts), und er kann Anker-Ziel sein. Das
// verlangt Client-State; SettingsPanel bleibt ohne ihn server-renderbar und
// wird weiter überall dort benutzt, wo nichts gemerkt werden muss.
// Das Element, auf das der URL-Hash zeigt — der Abschnitt selbst oder etwas
// darin. null, wenn der Hash leer ist oder woandershin zeigt.
function ankerZiel(
  panel: HTMLDetailsElement | null,
  hash: string,
  htmlId?: string,
): HTMLElement | null {
  if (!panel || hash.length < 2) return null;
  const id = hash.slice(1);
  if (htmlId && id === htmlId) return panel;
  try {
    // CSS.escape, weil eine id auch Zeichen tragen darf, die ein Selektor
    // sonst als Syntax liest.
    return panel.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  } catch {
    return null;
  }
}

export default function CollapsiblePanel({
  title,
  badge,
  storageId,
  htmlId,
  defaultOpen = true,
  children,
}: {
  title: string;
  // Kurzinfo rechts in der Kopfzeile — auf der Startseite die Anzahl der
  // Einträge, die der Abschnitt zugeklappt sonst verschweigt.
  badge?: ReactNode;
  // Schlüssel, unter dem der Zustand im Browser liegt (ohne Präfix, siehe
  // panelState.ts). Ohne Angabe wird nichts gemerkt.
  storageId?: string;
  // Anker-id: /pfad#<id> springt hierher und klappt auf — auch wenn der
  // Abschnitt zuletzt zugeklappt verlassen wurde. Genutzt vom Zahnrad neben
  // der Dashboard-Überschrift (/user#dashboard).
  //
  // Nicht nötig, damit ein Anker INNERHALB des Abschnitts funktioniert: Zeigt
  // der Hash auf irgendetwas hier drin, klappt der Abschnitt ebenfalls auf
  // (siehe unten).
  htmlId?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const wrapperRef = useRef<HTMLDetailsElement>(null);

  // Der gemerkte Zustand und der URL-Hash werden NACH dem Mount gelesen, nicht
  // im Render: localStorage und window.location stehen beim Server-Rendern
  // nicht zur Verfügung, ein daraus abgeleiteter Startwert wiche beim
  // Hydrieren ab (Mismatch). Das setState im Effect ist deshalb hier korrekt
  // und nicht der von der Regel gemeinte „abgeleitete State" — gleiche
  // Begründung wie in DataRowAccordion.tsx.
  //
  // Die Reihenfolge ist Absicht: Ein Anker schlägt den gemerkten Zustand.
  // Wer auf /user#dashboard klickt, will diesen Abschnitt sehen, auch wenn er
  // ihn beim letzten Mal zugeklappt hat.
  //
  // Gesucht wird dabei nicht nur die eigene id, sondern auch ein Ziel INNERHALB
  // des Abschnitts (/user#password liegt in „Settings"). Ohne das wäre ein
  // solcher Link tot, sobald der Abschnitt zu ist: Ein geschlossenes <details>
  // versteckt seinen Inhalt, der Browser springt nirgendwohin. Die Kinder
  // stehen dabei sehr wohl im DOM — nur unsichtbar —, querySelector findet
  // sie also.
  /* eslint-disable react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-derived-state, react-you-might-not-need-an-effect/no-event-handler */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ziel = ankerZiel(wrapperRef.current, window.location.hash, htmlId);
    if (ziel) {
      setOpen(true);
      // Erst nach dem Aufklappen scrollen, damit der Layout-Sprung des
      // geöffneten Abschnitts schon berücksichtigt ist.
      requestAnimationFrame(() => {
        ziel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (!storageId) return;
    const gemerkt = readPanelOpen(storageId);
    if (gemerkt !== null) setOpen(gemerkt);
  }, [htmlId, storageId]);
  /* eslint-enable react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-derived-state, react-you-might-not-need-an-effect/no-event-handler */

  // <details> statt Knopf plus eigenem Auf-/Zuklapp-Zustand: Die
  // Tastaturbedienung, die Rollen und das „im zugeklappten Text suchen" des
  // Browsers gibt es damit geschenkt. Gesteuert wird es trotzdem (open als
  // Prop), weil der gemerkte Zustand sonst nicht greifen könnte.
  return (
    <details
      id={htmlId}
      ref={wrapperRef}
      className="lcars-details rounded-[var(--lcars-radius-pill)] border border-lcars-border bg-lcars-surface px-[16px] py-[10px]"
      open={open}
      onToggle={(event) => {
        const jetzt = event.currentTarget.open;
        if (jetzt === open) return;
        setOpen(jetzt);
        if (storageId) writePanelOpen(storageId, jetzt);
      }}
    >
      <summary className="lcars-details-summary">
        <span
          className="lcars-data-row-chevron"
          style={{ margin: "0 4px 0 2px" }}
          aria-hidden="true"
        />
        <span className="lcars-eyebrow flex-1 text-lcars-primary-ink">
          {title}
        </span>
        {badge !== undefined && badge !== null && (
          <span className="font-lcars-mono text-[13px] text-lcars-ink-dim">
            {badge}
          </span>
        )}
      </summary>
      <div className="mt-[12px] flex flex-col gap-[10px]">{children}</div>
    </details>
  );
}

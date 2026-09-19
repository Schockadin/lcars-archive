"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronUpIcon } from "@/lib/icons";

// Ab wie vielen gescrollten Pixeln der Knopf erscheint. Nicht ab dem ersten
// Pixel: Beim Lesen wackelt die Position ständig um kleine Beträge, ein
// Knopf, der dabei auf- und zugeht, ist unruhiger als er nützt. Eine gute
// Handbreit Inhalt ist die Schwelle, ab der ein Sprung nach oben überhaupt
// eine Erleichterung ist.
const SHOW_AFTER_PX = 120;

// „Nach oben" für alle Seiten: Unten rechts, klebend über dem Inhalt, und nur
// sichtbar, solange es auch etwas nach oben zu scrollen gibt.
//
// Gescrollt wird in dieser App nicht das Fenster, sondern .lcars-main-content
// (siehe MainContent.tsx; html trägt overflow: clip). Deshalb hängt der
// Zuhörer an genau diesem Element statt an window, und deshalb ist der Kasten
// sticky statt fixed — fixed säße relativ zum Fenster und damit quer über
// Seitenleiste und Fußzeile.
//
// Der Kasten selbst bleibt immer im Baum, auch wenn der Knopf gerade nicht zu
// sehen ist: Er ist der Anker, über den der Zuhörer seine Scrollfläche
// überhaupt findet (closest). Er ist 0 Pixel hoch und lässt Klicks durch —
// am Ende des Inhalts soll er weder Platz belegen noch etwas abfangen.
export default function ScrollTopButton() {
  const dockRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scroller =
      dockRef.current?.closest<HTMLElement>(".lcars-main-content") ?? null;
    if (!scroller) return;
    scrollerRef.current = scroller;

    const update = () => setVisible(scroller.scrollTop > SHOW_AFTER_PX);
    // Die Scrollposition ist ein externer Zustand, den es beim SSR nicht
    // gibt, und die Fläche dazu findet sich erst über den gemounteten Kasten
    // (closest) — deshalb Abonnement und erster Abgleich hier statt als
    // Initialwert bzw. useSyncExternalStore.
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-external-store-subscription, react-you-might-not-need-an-effect/no-initialize-state
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, []);

  function scrollToTop() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Wer Bewegung im System abgestellt hat, bekommt den Sprung ohne
    // Animation — eine über mehrere Bildschirmhöhen laufende Fahrt ist genau
    // die Art Bewegung, die damit gemeint ist.
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    scroller.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });

    // Oben angekommen verschwindet der Knopf — mit ihm ginge der Fokus an
    // den Seitenkörper verloren, und wer mit der Tastatur arbeitet, müsste
    // sich von vorn durch die Seite tabben. Er wandert deshalb auf den
    // Inhaltsbereich, dasselbe Ziel, auf das auch die Sprungmarke „Zum
    // Inhalt springen" führt (tabIndex -1, siehe AppShell.tsx).
    // preventScroll: Das Scrollen erledigt schon die Zeile darüber, und zwar
    // weich — ein zweiter, harter Sprung durch den Fokus wäre ein Ruck.
    scroller
      .querySelector<HTMLElement>("#lcars-main")
      ?.focus({ preventScroll: true });
  }

  return (
    <div ref={dockRef} className="scroll-top-dock" aria-hidden={!visible}>
      {visible && (
        <button
          type="button"
          onClick={scrollToTop}
          className="scroll-top-btn lcars-icon-btn"
          aria-label="Nach oben"
          title="Nach oben"
        >
          <ChevronUpIcon />
        </button>
      )}
    </div>
  );
}

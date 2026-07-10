"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export interface SwitchOption<T extends string> {
  key: T;
  label: React.ReactNode;
  disabled?: boolean;
}

// Generischer LCARS-Umschalter für exklusive Optionen (Sortierung, Filter,
// Ansicht) — ein gemeinsamer, gleitender Amber-Balken markiert die aktive
// Option statt jeder Option ihren eigenen Aktiv-Hintergrund zu geben.
// Layout/Abstand kommt per className vom Aufrufer, da Toolbars
// unterschiedliche Container-Klassen mitbringen (.mission-sort,
// .search-type-filter [CSS-Grid, mehrzeilig], …) statt hier ein Layout zu
// erzwingen. Die Balken-Position/-Größe wird deshalb nicht naiv aus
// index/Anzahl berechnet (bricht bei mehrzeiligem Grid), sondern per
// getBoundingClientRect() der jeweils aktiven Schaltfläche gemessen — das
// funktioniert unabhängig davon, ob der Container ein einzeiliges Flex oder
// ein umbrechendes Grid ist.
export default function Switch<T extends string>({
  options,
  active,
  onChange,
  className,
  itemClassName = "lcars-switch-item flex-1",
}: {
  options: SwitchOption<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const [sliderStyle, setSliderStyle] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeEl = itemRefs.current.get(active);
    if (!container || !activeEl) return;

    const measure = () => {
      // getBoundingClientRect() statt offsetLeft/Top/Width/Height: Flex-Kinder
      // mit gleicher Breite (flex-1) landen bei ungerader Aufteilung auf
      // Subpixel-Breiten (z.B. 227.33px) — offsetWidth/offsetLeft runden auf
      // ganze Pixel, was sich über mehrere Geschwister-Elemente aufsummiert
      // und den Balken bei weiter rechts liegenden Optionen zunehmend zu
      // schmal/verschoben erscheinen lässt. getBoundingClientRect() liefert
      // die tatsächlichen Subpixel-Werte; einzig die eigene Border-Breite des
      // Containers muss man selbst herausrechnen (clientLeft/clientTop), da
      // absolut positionierte Kinder relativ zur Padding-Box (innerhalb des
      // Rands) positioniert werden, nicht relativ zur Border-Box.
      const containerRect = container.getBoundingClientRect();
      const rect = activeEl.getBoundingClientRect();
      setSliderStyle({
        opacity: 1,
        width: rect.width + 10,
        height: rect.height,
        transform: `translate(${rect.left - containerRect.left - container.clientLeft - 10}px, ${rect.top - containerRect.top - container.clientTop}px)`,
        borderRadius: getComputedStyle(activeEl).borderRadius,
      });
    };
    measure();

    // Größenänderungen (Resize, Umbruch bei mehrzeiligen Grids) neu vermessen.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [active, options]);

  return (
    <div ref={containerRef} className={`lcars-switch-group ${className ?? ""}`}>
      <div
        className="lcars-switch-slider"
        style={sliderStyle}
        aria-hidden="true"
      />
      {options.map((opt) => (
        <button
          key={opt.key}
          ref={(el) => {
            if (el) itemRefs.current.set(opt.key, el);
            else itemRefs.current.delete(opt.key);
          }}
          type="button"
          disabled={opt.disabled}
          aria-pressed={active === opt.key}
          onClick={opt.disabled ? undefined : () => onChange(opt.key)}
          className={`${itemClassName}${active === opt.key ? " lcars-switch-item--active" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

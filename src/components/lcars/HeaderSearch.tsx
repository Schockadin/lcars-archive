"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types/search";
import { TYPE_COLOR } from "@/lib/searchFormat";
import { useAnchoredDropdown } from "./useAnchoredDropdown";

// Globale Suche im Header mit Autovervollständigung. Ergebnisliste wird per
// Portal an <body> gehängt, da ein Vorfahr des Headers overflow:hidden setzt
// und das Dropdown sonst abgeschnitten würde.
export default function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  // Query, zu dem die aktuelle Ergebnisliste gehört — solange sie vom
  // getippten Query abweicht, läuft noch die Suche ("Suche …").
  const [resultsQuery, setResultsQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const q = query.trim();
  const showDropdown = focused && q.length >= 2;

  // Debounced Fetch (250 ms). Laufende Anfragen werden bei neuer Eingabe
  // abgebrochen, damit späte Antworten nicht die aktuelle Liste überschreiben.
  // Kein synchrones setState im Effekt-Body — nur in den async-Callbacks.
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((res) => res.json())
        .then((data: { results?: SearchResult[] }) => {
          setResults(data.results ?? []);
          setResultsQuery(q);
          setActive(-1);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) {
            setResults([]);
            setResultsQuery(q);
          }
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // closeOnEscape: false — Escape wird schon im onKeyDown des Inputs unten
  // behandelt (dort auch nötig für die Pfeiltasten-Navigation), ein
  // zusätzlicher document-weiter Escape-Handler wäre hier nur redundant.
  const anchor = useAnchoredDropdown({
    isOpen: showDropdown,
    triggerRef: inputRef,
    panelRef: dropdownRef,
    onClose: () => setFocused(false),
    offset: 5,
    closeOnEscape: false,
  });

  const go = useCallback(
    (r: SearchResult) => {
      router.push(r.href);
      setQuery("");
      setResults([]);
      setResultsQuery("");
      setFocused(false);
      inputRef.current?.blur();
    },
    [router],
  );

  // Navigiert zur eigenen Suchseite (Volltextsuche). Anders als go(): Query
  // und Ergebnisliste bleiben erhalten, damit das Suchfeld danach weiter den
  // Begriff zeigt.
  const goToSearchPage = useCallback(() => {
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setFocused(false);
    inputRef.current?.blur();
  }, [router, q]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    // Dropdown-Inhalt noch nicht für das aktuelle q geladen → nichts zu
    // navigieren (das "mehr"-Pseudo-Element ist erst danach vorhanden).
    if (!showDropdown || resultsQuery !== q) return;
    // + 1 für den "mehr"-Pseudo-Stopp am Ende der Liste.
    const stopCount = results.length + 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % stopCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? stopCount - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < results.length) go(results[active]);
      else goToSearchPage();
    }
  };

  return (
    <div className="lcars-search">
      <svg
        className="lcars-search-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path
          d="m20 20-3.5-3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="lcars-search-input"
        placeholder="Archiv durchsuchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          active >= 0 ? `${listboxId}-opt-${active}` : undefined
        }
      />

      {showDropdown &&
        anchor &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            className="lcars-search-dropdown lcars-scroll"
            style={{
              top: anchor.top,
              left: anchor.left,
              width: anchor.width,
            }}
          >
            {resultsQuery !== q ? (
              <p className="lcars-search-empty">Suche …</p>
            ) : (
              <>
                {results.map((r, i) => (
                  <button
                    key={`${r.href}-${i}`}
                    id={`${listboxId}-opt-${i}`}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    className="lcars-search-item"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      // vor dem document-mousedown/blur navigieren
                      e.preventDefault();
                      go(r);
                    }}
                  >
                    <span
                      className="lcars-search-dot"
                      style={{ backgroundColor: TYPE_COLOR[r.type] }}
                      aria-hidden="true"
                    />
                    <span className="lcars-search-text">
                      <span className="lcars-search-label">{r.label}</span>
                      <span className="lcars-search-sub">{r.sublabel}</span>
                    </span>
                  </button>
                ))}
                {/* Immer sichtbar, auch bei 0 Titel-Treffern — die
                    Volltextsuche auf /search kann trotzdem etwas finden. */}
                <button
                  id={`${listboxId}-opt-${results.length}`}
                  type="button"
                  role="option"
                  aria-selected={active === results.length}
                  className="lcars-search-item lcars-search-more"
                  onMouseEnter={() => setActive(results.length)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    goToSearchPage();
                  }}
                >
                  Alle Ergebnisse für „{q}“ anzeigen…
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

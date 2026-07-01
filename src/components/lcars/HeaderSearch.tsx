"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types/search";

// Akzentfarbe je Treffertyp (kleiner Punkt + Typ-Kürzel).
const TYPE_COLOR: Record<SearchResult["type"], string> = {
  character: "var(--lcars-blue)",
  mission: "var(--lcars-amber)",
  log: "var(--lcars-purple)",
  archive: "var(--lcars-text-data)",
};

interface Anchor {
  top: number;
  left: number;
  width: number;
}

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
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const q = query.trim();
  const showDropdown = focused && q.length >= 2;

  const measure = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.bottom + 5, left: r.left, width: r.width });
  }, []);

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

  // Position des Dropdowns aktuell halten, solange es offen ist.
  useEffect(() => {
    if (!showDropdown) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [showDropdown, measure]);

  // Klick außerhalb (Input UND Dropdown) schließt die Liste.
  useEffect(() => {
    if (!showDropdown) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !inputRef.current?.contains(t) &&
        !dropdownRef.current?.contains(t)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showDropdown]);

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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active >= 0 ? active : 0]);
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
        placeholder="Archiv durchsuchen …"
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
            ) : results.length === 0 ? (
              <p className="lcars-search-empty">Keine Treffer</p>
            ) : (
              results.map((r, i) => (
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
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

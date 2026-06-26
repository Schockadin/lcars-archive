"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LcarsDataRow } from "@/components/lcars";
import {
  MissionLogItem,
  MissionPreview,
  MissionStatus,
} from "@/types/missions";

// Sortierung der Log-Liste: flach nach Datum oder gruppiert nach Autor.
type LogSortMode = "date" | "author";

// Farbzyklus für die Autor-Gruppen-Header (analog zu den Status-/
// Generationsfarben der Charakterliste).
const AUTHOR_COLORS = [
  "var(--lcars-blue)",
  "var(--lcars-purple)",
  "var(--lcars-orange)",
  "var(--lcars-green)",
  "var(--lcars-amber)",
  "var(--lcars-red)",
];

// Vergleich für absteigende Datums-Sortierung (ISO-Strings, NULL ans Ende).
function byDateDesc(a: MissionLogItem, b: MissionLogItem): number {
  const da = a.log_date ?? "";
  const db = b.log_date ?? "";
  if (da === db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? 1 : -1;
}

// ─── Konfiguration ──────────────────────────────────────────
// Status → Label + Farbe. Die Farbe färbt die Schiene der Akte und
// ist (seit Entfall von Knoten/Badge) der einzige Status-Indikator.
const STATUS_CONFIG: Record<MissionStatus, { label: string; color: string }> = {
  active: { label: "Aktiv", color: "var(--lcars-green)" },
  completed: { label: "Abgeschlossen", color: "var(--lcars-blue)" },
  failed: { label: "Gescheitert", color: "var(--lcars-red)" },
  abandoned: { label: "Abgebrochen", color: "var(--lcars-amber)" },
};

// ISO-Datum (2400-09-15) → LCARS-Punktnotation (2400.09.15)
function fmtDate(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10).replace(/-/g, ".");
}

// Zeitraum-Label für die Metazeile. Offenes Ende → "LAUFEND".
function periodLabel(start: string | null, end: string | null): string {
  const s = fmtDate(start);
  const e = end ? fmtDate(end) : "LAUFEND";
  return s ? `${s} – ${e}` : e;
}

// Jahr aus einem ISO-Datum, oder null.
function yearOf(d: string | null): number | null {
  const y = d ? parseInt(d.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : null;
}

// ─── Hauptkomponente ────────────────────────────────────────
export default function MissionsChronik({
  missions,
  logsByMission,
}: {
  missions: MissionPreview[];
  logsByMission: Record<number, MissionLogItem[]>;
}) {
  usePageMeta("Missionen", "missions");

  // activeId hält den Inhalt des Log-Panels (bleibt beim Schließen
  // erhalten, damit es mit Inhalt nach rechts hinausgleitet);
  // open steuert das Auf-/Zugleiten.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  // Sortiermodus liegt hier (statt in LogList), damit die mobile
  // Höhen-Synchronisation auch beim Umschalten neu greift.
  const [logSort, setLogSort] = useState<LogSortMode>("date");

  const wrapRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // Auf Mobile sind die Panes absolut/translatiert positioniert — die
  // Wrapper-Höhe muss daher dem gerade sichtbaren Pane folgen. Ein
  // ResizeObserver fängt auch Höhenänderungen durch Sortierwechsel oder
  // aufgeklappte Logs ab.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    function sync() {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (mq.matches) {
        const active = open ? logsRef.current : overviewRef.current;
        wrap.style.height = active ? `${active.offsetHeight}px` : "";
      } else {
        wrap.style.height = "";
      }
    }
    sync();
    const ro = new ResizeObserver(sync);
    if (overviewRef.current) ro.observe(overviewRef.current);
    if (logsRef.current) ro.observe(logsRef.current);
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open, activeId]);

  function openMission(id: number) {
    setActiveId(id);
    setOpen(true);
  }
  function closeMission() {
    setOpen(false);
  }

  // Jahres-Labels für die (dekorative) Schiene aus den echten Daten
  // ableiten: jüngstes Jahr oben, ältestes unten.
  const years = missions
    .map((m) => yearOf(m.started_at))
    .filter((y): y is number => y != null);
  const latestYear = years.length ? Math.max(...years) : null;
  const earliestYear = years.length ? Math.min(...years) : null;

  if (missions.length === 0) {
    return (
      <div className="w-full max-w-[640px]">
        <h1 className="lcars-data-row-heading">Missionen</h1>
        <p className="char-file-bio-empty">
          Keine Missionen im Archiv hinterlegt.
        </p>
      </div>
    );
  }

  const activeMission = missions.find((m) => m.id === activeId) ?? null;
  const activeColor = activeMission
    ? STATUS_CONFIG[activeMission.status].color
    : "var(--lcars-amber)";
  return (
    <div
      ref={wrapRef}
      className="mission-split"
      data-open={open ? "true" : "false"}
    >
      {/* ── Übersicht (Chronik) ── */}
      <section ref={overviewRef} className="mission-overview">
        <div className="mb-[16px]">
          <h1 className="lcars-data-row-heading">Missionen</h1>
          <p className="lcars-eyebrow">
            Zeitstrahl der Kampagne · neueste zuerst
          </p>
        </div>

        <div className="mission-chronik">
          {/* dekorative Jahres-Schiene */}
          <div className="mission-rail" aria-hidden="true">
            <div className="mission-rail-cap">{latestYear ?? ""}</div>
            <div className="mission-rail-fill" />
            <div className="mission-rail-foot">
              {earliestYear && earliestYear !== latestYear ? earliestYear : ""}
            </div>
          </div>

          {/* gestapelte Einsatzakten */}
          <div className="mission-list">
            {missions.map((m) => (
              <MissionRow
                key={m.id}
                mission={m}
                active={open && m.id === activeId}
                onSelect={() => openMission(m.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Log-Liste ── */}
      <aside
        ref={logsRef}
        className="mission-logs"
        aria-hidden={!open}
        style={{ "--mission-color": activeColor } as React.CSSProperties}
      >
        <div className="mission-logs-head mt-[32px]">
          <button type="button" className="mission-back" onClick={closeMission}>
            ‹ Zurück
          </button>
          <h2 className="mission-logs-title">{activeMission?.title ?? ""}</h2>
        </div>

        {activeMission?.metadata.body && (
          <div
            className="mission-body lcars-text"
            dangerouslySetInnerHTML={{ __html: activeMission.metadata.body }}
          />
        )}

        {/* <p className="mission-logs-sub">Missions-Logs</p> */}

        <LogList
          key={activeMission?.id}
          logs={activeMission ? (logsByMission[activeMission.id] ?? []) : []}
          sort={logSort}
          onSortChange={setLogSort}
        />
      </aside>
    </div>
  );
}

// ─── Einsatzakte (anklickbar) ───────────────────────────────
function MissionRow({
  mission,
  active,
  onSelect,
}: {
  mission: MissionPreview;
  active: boolean;
  onSelect: () => void;
}) {
  const cfg = STATUS_CONFIG[mission.status];
  const code = `M-${String(mission.id).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="mission-akte"
      data-active={active ? "true" : "false"}
      aria-label={`${mission.title} — ${cfg.label}`}
      style={{ "--mission-color": cfg.color } as React.CSSProperties}
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{mission.title}</span>
        {mission.summary && (
          <span
            className="mission-akte-summary block"
            dangerouslySetInnerHTML={{ __html: mission.summary }}
          />
        )}
        <span className="mission-akte-meta">
          <span>
            <b>Code</b> {code}
          </span>
          <span>
            <b>Zeitraum</b> {periodLabel(mission.started_at, mission.ended_at)}
          </span>
          <span>
            <b>Logs</b> {mission.log_count}
          </span>
        </span>
      </span>
    </button>
  );
}

// ─── Log-Sortier-Umschalter ─────────────────────────────────
// Zwei LCARS-Pills, identisches Muster wie der SortSwitch der
// Charakterliste.
function LogSortSwitch({
  mode,
  onChange,
}: {
  mode: LogSortMode;
  onChange: (m: LogSortMode) => void;
}) {
  const options: { key: LogSortMode; label: string }[] = [
    { key: "date", label: "Datum" },
    { key: "author", label: "Autor" },
  ];

  return (
    <div className="flex gap-[10px] max-w-[300px] mb-[12px]">
      {options.map((opt) => {
        const isActive = mode === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="lcars-switch flex-1"
            style={{
              backgroundColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-surface)",
              color: isActive ? "var(--lcars-bg)" : "var(--lcars-text-data)",
              borderColor: isActive
                ? "var(--lcars-amber)"
                : "var(--lcars-text-data)",
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Log-Liste ──────────────────────────────────────────────
function LogList({
  logs,
  sort,
  onSortChange,
}: {
  logs: MissionLogItem[];
  sort: LogSortMode;
  onSortChange: (m: LogSortMode) => void;
}) {
  // Immer zuerst absteigend nach Datum — das ist sowohl der Datums-Modus
  // selbst als auch die Sekundär-Sortierung innerhalb jeder Autor-Gruppe.
  // Aufgeklappte Logs (mehrere gleichzeitig möglich).
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sortedByDate = useMemo(() => [...logs].sort(byDateDesc), [logs]);

  // Nach Autor gruppieren. Da sortedByDate bereits datums-absteigend ist,
  // erscheinen die Autoren in Reihenfolge ihres jüngsten Logs und die
  // Logs je Gruppe bleiben absteigend sortiert.
  const authorGroups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; logs: MissionLogItem[] }
    >();
    for (const log of sortedByDate) {
      const key = log.author_id != null ? String(log.author_id) : "none";
      let group = map.get(key);
      if (!group) {
        group = {
          name: log.author_name ?? "Unbekannt",
          color: AUTHOR_COLORS[map.size % AUTHOR_COLORS.length],
          logs: [],
        };
        map.set(key, group);
      }
      group.logs.push(log);
    }
    return [...map.values()];
  }, [sortedByDate]);

  if (logs.length === 0) {
    return (
      <p className="mission-log-empty">Keine Logs zu dieser Mission erfasst.</p>
    );
  }

  return (
    <>
      <LogSortSwitch mode={sort} onChange={onSortChange} />

      {sort === "date" ? (
        <div className="mission-log-list">
          {sortedByDate.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              showAuthor
              expanded={expanded.has(log.id)}
              onToggle={() => toggle(log.id)}
            />
          ))}
        </div>
      ) : (
        authorGroups.map((group) => (
          <section key={group.name} className="mission-log-group">
            <LcarsDataRow
              value={group.logs.length}
              label={group.name}
              accentColor={group.color}
              color={group.color}
            />
            <div className="mission-log-list mt-[8px]">
              {group.logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  showAuthor={false}
                  expanded={expanded.has(log.id)}
                  onToggle={() => toggle(log.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

// ─── Einzelne Log-Zeile (klappt den Log-Text aus) ───────────
function LogRow({
  log,
  showAuthor,
  expanded,
  onToggle,
}: {
  log: MissionLogItem;
  showAuthor: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const session =
    log.session_nr != null
      ? `S-${String(log.session_nr).padStart(2, "0")}`
      : "LOG";

  return (
    <div className="mission-log-item">
      <button
        type="button"
        onClick={onToggle}
        className="mission-log-entry"
        aria-expanded={expanded}
      >
        <span className="mission-log-stub">{session}</span>
        <span className="mission-log-bar">
          <span className="mission-log-name">{log.title}</span>
          <span className="mission-log-meta">
            {showAuthor && log.author_name && (
              <span className="mission-log-author">{log.author_name}</span>
            )}
            {log.log_date && (
              <span className="mission-log-date">{fmtDate(log.log_date)}</span>
            )}
            <span
              className="mission-log-caret"
              data-open={expanded ? "true" : "false"}
              aria-hidden="true"
            >
              ›
            </span>
          </span>
        </span>
      </button>

      <div
        className="mission-log-reveal"
        data-open={expanded ? "true" : "false"}
      >
        <div className="mission-log-reveal-inner">
          <div
            className="lcars-text mission-log-content"
            dangerouslySetInnerHTML={{ __html: log.content }}
          />
        </div>
      </div>
    </div>
  );
}

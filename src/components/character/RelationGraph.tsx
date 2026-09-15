"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  edgeWeight,
  edgeWidth,
  layoutRelationGraph,
  nodeRadius,
  type LayoutInput,
} from "@/lib/relationGraphLayout";
import {
  DEFAULT_RELATION_FILTER,
  filterRelationGraph,
  isDefaultFilter,
  relationGraphList,
  type RelationGraphFilter,
} from "@/lib/relationGraphFilter";

// Beziehungsgraph als Inline-SVG. Keine Diagramm-Bibliothek: gebraucht werden
// Kreise, Linien und Text — dafür lohnt kein zusätzliches Bundle, und das
// Layout ist ohnehin eine eigene, geprüfte Funktion
// (src/lib/relationGraphLayout.ts).
//
// Client-Komponente aus zwei Gründen:
//   • Hervorheben: Zeigt oder tastet man auf eine Figur, treten sie und ihre
//     Verbindungen hervor, alles andere tritt zurück.
//   • Filtern: Quellen (Kästchen), NPCs, Mindeststärke und Fokus grenzen ein, was
//     überhaupt gezeichnet wird (siehe src/lib/relationGraphFilter.ts — dort
//     steht auch, warum gefiltert statt anders gezeichnet wird).
//
// Ohne JavaScript bleibt der volle Graph sichtbar, nur eben ohne Hervorheben
// und ohne Filter — und die Verbindungsliste darunter trägt dieselbe
// Information in Textform.

// Obergrenze der Mindeststärke-Auswahl. Angeboten wird nur, was es im
// Graphen auch gibt (aus dem stärksten Kantengewicht abgeleitet, siehe
// minWeightOptions) — eine Auswahl, die garantiert nichts liefert, hilft
// niemandem; dieselbe Regel wie bei den Changelog-Kategorien und der
// Chronologie. Der Deckel hält die Liste kurz, wenn eine einzelne Verbindung
// sehr viele Berührungspunkte hat.
const MAX_MIN_WEIGHT = 10;

function minWeightOptions(graph: LayoutInput): number[] {
  const strongest = graph.edges.reduce(
    (max, edge) => Math.max(max, edgeWeight(edge)),
    1,
  );
  const highest = Math.min(MAX_MIN_WEIGHT, strongest);
  return Array.from({ length: highest }, (_, i) => i + 1);
}

export default function RelationGraph({ graph }: { graph: LayoutInput }) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<RelationGraphFilter>(
    DEFAULT_RELATION_FILTER,
  );

  const filtered = useMemo(
    () => filterRelationGraph(graph, filter),
    [graph, filter],
  );
  const layout = useMemo(() => layoutRelationGraph(filtered), [filtered]);
  const list = useMemo(() => relationGraphList(filtered), [filtered]);

  // Auswahlliste für den Fokus: immer alle Figuren des ungefilterten Graphen,
  // alphabetisch — sonst könnte man die gerade fokussierte Figur nicht mehr
  // wechseln, sobald der Filter sie als einzige übrig lässt.
  const weightOptions = useMemo(() => minWeightOptions(graph), [graph]);

  const allNodes = useMemo(
    () => [...graph.nodes].sort((a, b) => a.name.localeCompare(b.name, "de")),
    [graph.nodes],
  );

  const characterCount = filtered.nodes.filter(
    (n) => n.kind === "character",
  ).length;
  const npcCount = filtered.nodes.length - characterCount;

  if (graph.nodes.length === 0) {
    return (
      <p className="lcars-empty-state">
        Noch keine Verbindungen — sie entstehen aus gemeinsamen Missionen,
        Gesprächen und Verlinkungen.
      </p>
    );
  }

  const isDim = (slug: string) =>
    active !== null &&
    active !== slug &&
    !layout.edges.some(
      (e) =>
        (e.source === active && e.target === slug) ||
        (e.target === active && e.source === slug),
    );

  const toggle = (key: "missions" | "dialogues" | "links" | "npcs") =>
    setFilter((f) => ({ ...f, [key]: !f[key] }));

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="relation-graph-controls">
        <div className="flex flex-wrap items-center gap-[6px_14px]">
          <span className="lcars-eyebrow text-lcars-ink-dim">Zeigen</span>
          {(
            [
              ["missions", "Missionen"],
              ["dialogues", "Gespräche"],
              ["links", "Verlinkungen"],
              ["npcs", "NPCs"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-[6px]">
              <input
                id={`relation-graph-${key}`}
                type="checkbox"
                className="lcars-checkbox"
                checked={filter[key]}
                onChange={() => toggle(key)}
              />
              <label
                htmlFor={`relation-graph-${key}`}
                className="lcars-eyebrow"
              >
                {label}
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          <label className="flex items-center gap-[6px]">
            <span className="lcars-eyebrow text-lcars-ink-dim">Fokus</span>
            <select
              className="lcars-input rounded-full"
              value={filter.focus ?? ""}
              onChange={(e) =>
                setFilter((f) => ({ ...f, focus: e.target.value || null }))
              }
            >
              <option value="">Alle Figuren</option>
              {allNodes.map((node) => (
                <option key={node.slug} value={node.slug}>
                  {node.name}
                  {node.kind === "npc" ? " (NPC)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-[6px]">
            <span className="lcars-eyebrow text-lcars-ink-dim">
              Mindeststärke
            </span>
            <select
              className="lcars-input rounded-full"
              value={filter.minWeight}
              onChange={(e) =>
                setFilter((f) => ({ ...f, minWeight: Number(e.target.value) }))
              }
            >
              {weightOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 1
                    ? "alle Verbindungen"
                    : `ab ${value} Berührungspunkten`}
                </option>
              ))}
            </select>
          </label>

          {!isDefaultFilter(filter) && (
            <button
              type="button"
              className="lcars-pill-btn--outline"
              onClick={() => setFilter(DEFAULT_RELATION_FILTER)}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {layout.nodes.length === 0 ? (
        <p className="lcars-empty-state">
          Keine Verbindung passt zu dieser Auswahl — eine Quelle oder die
          NPCs wieder zuschalten, die Mindeststärke senken oder den Fokus
          aufheben.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="relation-graph"
          role="img"
          aria-label={`Beziehungsgraph mit ${layout.nodes.length} Figuren und ${layout.edges.length} Verbindungen`}
        >
          {layout.edges.map((edge) => {
            const dim =
              active !== null &&
              edge.source !== active &&
              edge.target !== active;
            return (
              <line
                key={`${edge.source}|${edge.target}`}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                strokeWidth={edgeWidth(edge.weight)}
                className={
                  dim ? "relation-graph-edge is-dim" : "relation-graph-edge"
                }
              />
            );
          })}

          {layout.nodes.map((node) => {
            // Beschriftung nach außen: auf der linken Kreishälfte
            // rechtsbündig, sonst linksbündig — sonst liefe der Text über den
            // Graphen.
            const onLeft = Math.cos(node.angle) < 0;
            const r = nodeRadius(node.weight);
            const labelX = node.x + Math.cos(node.angle) * (r + 6);
            const labelY = node.y + Math.sin(node.angle) * (r + 6);
            return (
              <Link
                key={node.slug}
                href={node.href}
                className={
                  isDim(node.slug)
                    ? "relation-graph-node is-dim"
                    : "relation-graph-node"
                }
                onMouseEnter={() => setActive(node.slug)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(node.slug)}
                onBlur={() => setActive(null)}
              >
                <title>{`${node.name}${node.kind === "npc" ? " (NPC)" : ""}`}</title>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  className={
                    node.kind === "npc"
                      ? "relation-graph-dot is-npc"
                      : "relation-graph-dot"
                  }
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={onLeft ? "end" : "start"}
                  dominantBaseline="middle"
                  className="relation-graph-label"
                >
                  {node.name}
                </text>
              </Link>
            );
          })}
        </svg>
      )}

      <p className="text-lcars-ink-dim text-[13px]">
        {`${characterCount} ${characterCount === 1 ? "Charakter" : "Charaktere"}` +
          (npcCount > 0
            ? ` und ${npcCount} ${npcCount === 1 ? "NPC" : "NPCs"}`
            : "") +
          ` · ${filtered.edges.length} ${filtered.edges.length === 1 ? "Verbindung" : "Verbindungen"}` +
          (isDefaultFilter(filter)
            ? ""
            : ` (gefiltert aus ${graph.nodes.length} Figuren und ${graph.edges.length} Verbindungen)`)}
      </p>

      {/* Dieselbe Information in Textform — für Screenreader, für kleine
          Bildschirme und für alle, die eine Rangfolge lieber lesen als aus
          Punktgrößen und Strichstärken ableiten. Folgt den Filtern oben. */}
      {list.length > 0 && (
        <details className="lcars-details">
          <summary className="lcars-details-summary">
            <span
              className="lcars-data-row-chevron"
              style={{ margin: "0 4px 0 2px" }}
              aria-hidden="true"
            />
            <span className="lcars-eyebrow text-lcars-primary-ink">
              Verbindungen als Liste
            </span>
          </summary>
          <ul className="mt-[12px] flex flex-col gap-[10px]">
            {list.map((entry) => (
              <li key={`${entry.kind}:${entry.slug}`}>
                <Link href={entry.href} className="lcars-wikilink">
                  {entry.name}
                </Link>
                {entry.kind === "npc" && (
                  <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
                    {" "}
                    · NPC
                  </span>
                )}
                <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
                  {` · ${entry.weight} ${entry.weight === 1 ? "Berührungspunkt" : "Berührungspunkte"}`}
                </span>
                {entry.partners.length > 0 && (
                  <ul className="ml-[16px] flex flex-col gap-[2px]">
                    {entry.partners.map((partner) => (
                      <li
                        key={`${partner.kind}:${partner.slug}`}
                        className="text-[13px]"
                      >
                        <Link href={partner.href} className="lcars-wikilink">
                          {partner.name}
                        </Link>
                        <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
                          {` · ${partner.weight}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

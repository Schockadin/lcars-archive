"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StoryGraph, StoryNode } from "@/types/storyGraph";

const TYPE_COLOR: Record<StoryNode["type"], string> = {
  character: "#9a9aff", // --lcars-blue
  mission: "#ff9a00", // --lcars-amber
  archive: "#cd9acd", // --lcars-purple
};

const TYPE_LABEL: Record<StoryNode["type"], string> = {
  character: "Charakter",
  mission: "Mission",
  archive: "Archiv",
};

// Ein Knoten ist im kumulativen Jahres-Filter sichtbar, sobald der Regler >=
// seinem frühesten Jahr steht. Knoten OHNE Jahr (minYear null) sind IMMER
// sichtbar — sie sind Teil der Geschichte, aber nicht auf der Jahresachse
// verortbar, und sollen nicht still verschwinden.
function nodeVisibleAt(minYear: number | null, year: number): boolean {
  return minYear == null || minYear <= year;
}

// Interaktiver Story-Graph der Timeline: Charaktere/Missionen/Archiv-Einträge
// als Knoten, interne Verlinkungen als Kanten (StoryGraph via storyGraph.ts).
// Der Jahr-Regler (+ Zahlenfeld) oben blendet kumulativ ein: je weiter nach
// rechts, desto mehr der Geschichte erscheint. cytoscape wird — wie im
// ER-Diagramm — erst client-seitig per dynamischem import geladen; das Layout
// läuft EINMAL über alle Knoten, danach werden Knoten/Kanten nur ein-/
// ausgeblendet (feste Positionen, „wachsende" Geschichte an Ort und Stelle).
export default function StoryGraph({ graph }: { graph: StoryGraph }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<import("cytoscape").Core | undefined>(undefined);
  const [selected, setSelected] = useState<StoryNode | null>(null);

  const range = graph.yearRange;
  const [year, setYear] = useState<number>(range ? range.max : 0);

  const minYearById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const n of graph.nodes) map.set(n.id, n.minYear);
    return map;
  }, [graph.nodes]);

  // cytoscape einmal aufbauen (Layout über ALLE Knoten).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graph.nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label,
              color: TYPE_COLOR[n.type],
            },
          })),
          ...graph.edges.map((e, i) => ({
            data: {
              id: `edge-${i}`,
              source: e.source,
              target: e.target,
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "#000",
              "font-family": "var(--font-antonio), sans-serif",
              "font-size": "10px",
              "text-wrap": "wrap",
              "text-max-width": "120px",
              "text-valign": "center",
              "text-halign": "center",
              shape: "round-rectangle",
              width: "label",
              height: "label",
              padding: "8px",
            },
          },
          {
            selector: "node:selected",
            style: { "border-width": 3, "border-color": "#fff" },
          },
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color": "#6b6b8a",
              "target-arrow-color": "#6b6b8a",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.8,
              "curve-style": "bezier",
              opacity: 0.7,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          padding: 24,
          nodeRepulsion: () => 8000,
          idealEdgeLength: () => 120,
        },
        wheelSensitivity: 0.2,
        minZoom: 0.15,
        maxZoom: 3,
      });

      const byId = new Map(graph.nodes.map((n) => [n.id, n]));
      cy.on("tap", "node", (evt) => {
        const n = byId.get(evt.target.id());
        if (n) setSelected(n);
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) setSelected(null);
      });

      cyRef.current = cy;
      applyYear(cy, minYearById, range ? range.max : 0);
    });

    return () => {
      cancelled = true;
      cyRef.current?.destroy();
      cyRef.current = undefined;
    };
    // Nur beim ersten Aufbau / Graph-Wechsel — die Jahr-Filterung läuft über
    // den separaten Effect unten, ohne das Layout neu zu rechnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Jahr-Änderung: nur ein-/ausblenden, kein Re-Layout.
  useEffect(() => {
    if (cyRef.current) applyYear(cyRef.current, minYearById, year);
  }, [year, minYearById]);

  if (graph.nodes.length === 0) {
    return (
      <p className="lcars-empty-state">
        Noch keine verknüpften Inhalte für den Story-Graph vorhanden.
      </p>
    );
  }

  const visibleCount = range
    ? graph.nodes.filter((n) => nodeVisibleAt(n.minYear, year)).length
    : graph.nodes.length;

  return (
    <div className="story-graph">
      {range && (
        <div className="story-graph-controls">
          <label htmlFor="story-year" className="lcars-eyebrow">
            Jahr bis
          </label>
          <input
            id="story-year"
            type="range"
            min={range.min}
            max={range.max}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="story-graph-slider"
            aria-label="Jahr (bis)"
          />
          <input
            type="number"
            min={range.min}
            max={range.max}
            value={year}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) {
                setYear(Math.min(range.max, Math.max(range.min, v)));
              }
            }}
            className="lcars-input rounded-full story-graph-year-input"
            aria-label="Jahr (Eingabe)"
          />
          <span className="text-lcars-text-dim text-[12px] whitespace-nowrap">
            {visibleCount} Inhalte sichtbar
          </span>
        </div>
      )}

      <div className="story-graph-body">
        <div ref={containerRef} className="story-graph-canvas" />
        {selected && (
          <aside className="story-graph-detail lcars-scroll">
            <span
              className="lcars-eyebrow"
              style={{ color: TYPE_COLOR[selected.type] }}
            >
              {TYPE_LABEL[selected.type]}
            </span>
            <h3 className="text-lcars-text-contrast font-bold">
              {selected.label}
            </h3>
            <p className="text-lcars-text-dim text-[12px]">
              {selected.minYear != null
                ? `Ab Jahr ${selected.minYear}`
                : "Ohne Jahr"}
            </p>
            <a href={selected.href} className="lcars-link-text text-[13px]">
              Öffnen →
            </a>
          </aside>
        )}
      </div>
    </div>
  );
}

function applyYear(
  cy: import("cytoscape").Core,
  minYearById: Map<string, number | null>,
  year: number,
) {
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const visible = nodeVisibleAt(minYearById.get(node.id()) ?? null, year);
      node.style("display", visible ? "element" : "none");
    });
    cy.edges().forEach((edge) => {
      const srcVisible = nodeVisibleAt(
        minYearById.get(edge.source().id()) ?? null,
        year,
      );
      const tgtVisible = nodeVisibleAt(
        minYearById.get(edge.target().id()) ?? null,
        year,
      );
      edge.style("display", srcVisible && tgtVisible ? "element" : "none");
    });
  });
}

"use client";
import { useEffect, useRef, useState } from "react";
import type { SchemaGraph, ErTable } from "@/lib/dbInspect";

// Interaktives, graph-basiertes ER-Diagramm des DB-Schemas (Tabellen als Knoten,
// Fremdschlüssel als gerichtete Kanten) mit cytoscape.js. Die Struktur kommt
// live aus getSchemaGraph() (dbInspect.ts). cytoscape wird bewusst erst im
// useEffect per dynamischem import geladen — so landet die Library nur im
// Client-Bundle dieser Admin-Seite und nie im SSR-Pfad. Knoten sind ziehbar,
// die Fläche lässt sich zoomen/verschieben; ein Klick auf eine Tabelle zeigt
// rechts ihre Spalten.
export default function ErDiagram({ graph }: { graph: SchemaGraph }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ErTable | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cy: import("cytoscape").Core | undefined;
    let cancelled = false;

    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !containerRef.current) return;
      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graph.tables.map((t) => ({
            data: { id: t.name, label: `${t.name}\n${t.columns.length} Sp.` },
          })),
          ...graph.edges.map((e, i) => ({
            data: {
              id: `edge-${i}`,
              source: e.source,
              target: e.target,
              label: e.column,
            },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "#9a9aff",
              label: "data(label)",
              color: "#000",
              "font-family": "var(--font-antonio), sans-serif",
              "font-size": "11px",
              "text-wrap": "wrap",
              "text-valign": "center",
              "text-halign": "center",
              shape: "round-rectangle",
              width: "label",
              height: "label",
              padding: "10px",
            },
          },
          {
            selector: "node:selected",
            style: { "background-color": "#ff9a00", "border-width": 2, "border-color": "#fff" },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#cd9acd",
              "target-arrow-color": "#cd9acd",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(label)",
              "font-size": "9px",
              color: "#cd9acd",
              "text-rotation": "autorotate",
              "text-background-color": "#000",
              "text-background-opacity": 0.6,
              "text-background-padding": "2px",
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          padding: 24,
          nodeRepulsion: () => 9000,
          idealEdgeLength: () => 130,
        },
        wheelSensitivity: 0.2,
        minZoom: 0.2,
        maxZoom: 3,
      });

      const byName = new Map(graph.tables.map((t) => [t.name, t]));
      cy.on("tap", "node", (evt) => {
        const table = byName.get(evt.target.id());
        if (table) setSelected(table);
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) setSelected(null);
      });

      // Defensiv: falls der Container beim Init (v.a. mobil, während der
      // Hydration) noch nicht final vermessen war, im nächsten Frame neu
      // messen und einpassen.
      requestAnimationFrame(() => {
        if (cancelled || !cy) return;
        cy.resize();
        cy.fit(undefined, 24);
      });
    });

    return () => {
      cancelled = true;
      cy?.destroy();
    };
  }, [graph]);

  return (
    <div className="er-diagram">
      <div ref={containerRef} className="er-diagram-canvas" />
      {selected && (
        <aside className="er-diagram-detail lcars-scroll">
          <h3 className="text-lcars-amber font-bold">{selected.name}</h3>
          <p className="text-lcars-text-dim text-[11px] mb-[6px]">
            {selected.columns.length} Spalten
          </p>
          <ul className="flex flex-col gap-[2px] text-[12px]">
            {selected.columns.map((c) => (
              <li key={c.name} className="flex justify-between gap-[8px]">
                <span className="text-lcars-text-data">{c.name}</span>
                <span className="text-lcars-text-dim whitespace-nowrap">
                  {c.type}
                  {c.nullable ? "" : " · NN"}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

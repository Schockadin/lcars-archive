"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  edgeWidth,
  layoutRelationGraph,
  nodeRadius,
  type LayoutInput,
} from "@/lib/relationGraphLayout";

// Beziehungsgraph als Inline-SVG. Keine Diagramm-Bibliothek: gebraucht werden
// Kreise, Linien und Text — dafür lohnt kein zusätzliches Bundle, und das
// Layout ist ohnehin eine eigene, geprüfte Funktion
// (src/lib/relationGraphLayout.ts).
//
// Client-Komponente nur wegen des Hervorhebens: Zeigt oder tastet man auf eine
// Figur, treten sie und ihre Verbindungen hervor, alles andere tritt zurück.
// Ohne JavaScript bleibt der Graph sichtbar, nur eben ohne Hervorhebung — die
// Namensliste darunter (RelationsSection auf der Charakterseite bzw. die
// Legende hier) trägt dieselbe Information in Textform.

export default function RelationGraph({ graph }: { graph: LayoutInput }) {
  const [active, setActive] = useState<string | null>(null);

  const layout = useMemo(() => layoutRelationGraph(graph), [graph]);

  if (layout.nodes.length === 0) {
    return (
      <p className="lcars-empty-state">
        Noch keine Verbindungen — sie entstehen aus gemeinsamen Missionen und
        Gesprächen.
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

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="relation-graph"
      role="img"
      aria-label={`Beziehungsgraph mit ${layout.nodes.length} Figuren und ${layout.edges.length} Verbindungen`}
    >
      {layout.edges.map((edge) => {
        const dim =
          active !== null && edge.source !== active && edge.target !== active;
        return (
          <line
            key={`${edge.source}|${edge.target}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            strokeWidth={edgeWidth(edge.weight)}
            className={dim ? "relation-graph-edge is-dim" : "relation-graph-edge"}
          />
        );
      })}

      {layout.nodes.map((node) => {
        // Beschriftung nach außen: auf der linken Kreishälfte rechtsbündig,
        // sonst linksbündig — sonst liefe der Text über den Graphen.
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
  );
}

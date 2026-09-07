import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import RelationGraph from "@/components/character/RelationGraph";
import { getRelationGraph } from "@/lib/relations";
import { getViewer } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Beziehungen",
};

// Beziehungsgraph der ganzen Kampagne. Die Adresse liegt bewusst UNTER
// /characters, weil sie inhaltlich dorthin gehört; eine statische Route
// gewinnt in Next.js gegen die dynamische [slug], ein Charakter mit dem Slug
// „beziehungen" wäre also nicht mehr erreichbar — bei einem deutschen
// Sachbegriff als Figurenname ist das ein hinnehmbarer Preis.
//
// Nicht gecacht („use cache" fehlt bewusst): der Graph hängt an der
// Sichtbarkeit des Betrachters (nicht-öffentliche Gespräche), ein geteilter
// Cache würde ihn quer über Konten ausliefern.
export default async function BeziehungenPage() {
  const viewer = await getViewer();
  const graph = await getRelationGraph(viewer);

  const characterCount = graph.nodes.filter((n) => n.kind === "character").length;
  const npcCount = graph.nodes.length - characterCount;

  return (
    <>
      <PageMeta title="Beziehungen" section="characters" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Kampagne · Wer kennt wen</p>
        <h1>Beziehungen</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Wer war mit wem im Einsatz und wer hat mit wem geredet — abgeleitet
            aus gemeinsamen Missionen und Gesprächen. Es gibt keine eigene
            Beziehungspflege: Verbindungen entstehen im Spiel. Je dicker eine
            Linie, desto mehr Berührungspunkte; je größer ein Punkt, desto mehr
            Verbindungen hat die Figur. Ein Klick führt zur Figur.
          </p>

          <RelationGraph graph={graph} />

          <p className="text-lcars-ink-dim text-[13px]">
            {graph.nodes.length === 0
              ? "Noch keine Verbindungen erfasst."
              : `${characterCount} ${characterCount === 1 ? "Charakter" : "Charaktere"}` +
                (npcCount > 0
                  ? ` und ${npcCount} ${npcCount === 1 ? "NPC" : "NPCs"}`
                  : "") +
                ` · ${graph.edges.length} ${graph.edges.length === 1 ? "Verbindung" : "Verbindungen"}`}
          </p>

          {/* Dieselbe Information in Textform — für Screenreader, für kleine
              Bildschirme und für alle, die lieber lesen als deuten. */}
          {graph.nodes.length > 0 && (
            <details className="lcars-details">
              <summary className="lcars-details-summary">
                <span
                  className="lcars-data-row-chevron"
                  style={{ margin: "0 4px 0 2px" }}
                  aria-hidden="true"
                />
                <span className="lcars-eyebrow text-lcars-primary-ink">
                  Alle Figuren als Liste
                </span>
              </summary>
              <ul className="mt-[12px] flex flex-col gap-[4px]">
                {graph.nodes.map((node) => (
                  <li key={`${node.kind}:${node.slug}`}>
                    <Link href={node.href} className="lcars-wikilink">
                      {node.name}
                    </Link>
                    {node.kind === "npc" && (
                      <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
                        {" "}
                        · NPC
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </article>
    </>
  );
}

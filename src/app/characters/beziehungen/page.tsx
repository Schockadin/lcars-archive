import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import RelationGraph from "@/components/character/RelationGraph";
import { getRelationGraph } from "@/lib/relations";

export const metadata: Metadata = {
  title: "Beziehungen",
};

// Beziehungsgraph der ganzen Kampagne. Die Adresse liegt bewusst UNTER
// /characters, weil sie inhaltlich dorthin gehört; eine statische Route
// gewinnt in Next.js gegen die dynamische [slug], ein Charakter mit dem Slug
// „beziehungen" wäre also nicht mehr erreichbar — bei einem deutschen
// Sachbegriff als Figurenname ist das ein hinnehmbarer Preis.
//
// Nicht gecacht („use cache" fehlt bewusst): Der Graph ist zwar seit v1.34
// für alle derselbe (er kennt nur Veröffentlichtes), die Seite selbst bleibt
// aber dynamisch — die Daten kommen aus mehreren Tabellen, deren Cache-Tags
// hier nicht sauber zu bündeln wären.
export default async function BeziehungenPage() {
  const graph = await getRelationGraph();

  return (
    <>
      <PageMeta title="Beziehungen" section="characters" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Kampagne · Wer kennt wen</p>
        <h1>Beziehungen</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Wer war mit wem im Einsatz, wer hat mit wem geredet und wer
            verweist im eigenen Text auf wen — abgeleitet aus gemeinsamen
            Missionen, gemeinsamen Gesprächen und den Verlinkungen zwischen
            Charakteren und NPCs. Es gibt keine eigene Beziehungspflege:
            Verbindungen entstehen im Spiel. Je dicker eine Linie, desto mehr
            Berührungspunkte; je größer ein Punkt, desto mehr Verbindungen hat
            die Figur. Ein Klick führt zur Figur. Wird es zu voll: Die
            Schalter über dem Graphen blenden Quellen oder NPCs aus, heben die
            Mindeststärke an oder zeigen nur eine Figur samt ihren direkten
            Verbindungen; die Liste darunter trägt dieselbe Auswahl in
            Textform.
          </p>

          <RelationGraph graph={graph} />
        </div>
      </article>
    </>
  );
}

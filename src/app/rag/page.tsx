import { Suspense } from "react";
import { redirect, forbidden } from "next/navigation";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { hasRagConfig } from "@/lib/rag";
import { LcarsSkeleton } from "@/components/lcars";
import PageMeta from "@/components/PageMeta";
import RagChat from "./RagChat";

export const metadata = {
  title: {
    default: "Datenbank-Assistent",
  },
};

export default function RagPage() {
  return (
    <>
      <PageMeta title="Datenbank-Assistent" section="rag" />
      {/* Gleiche Content-Breite wie /search (das denselben Datenbank-Assistenten
          einbettet) und die übrigen Inhaltsseiten — 640px. */}
      <div className="w-full max-w-[640px]">
        <div className="mb-[16px]">
          <h1 className="lcars-data-row-heading">Datenbank-Assistent</h1>
          <p className="lcars-eyebrow">
            Fragen an den Kampagnen-Datenbestand stellen
          </p>
        </div>
        {/* Login-/Rechte-Prüfung liest den Betrachter aus dem Cookie
            (Laufzeit) — unter cacheComponents in einer Suspense-Grenze, damit
            der statische Seitenkopf sofort steht. */}
        <Suspense fallback={<LcarsSkeleton className="h-[200px] w-full" />}>
          <RagGate />
        </Suspense>
      </div>
    </>
  );
}

async function RagGate() {
  // Erfordert Login (redirect) UND das Recht rag.use (forbidden) — dieselbe
  // Linie wie die übrigen gated Seiten (siehe src/lib/dal.ts). Anonyme
  // Betrachter (getViewer === null) landen auf /login.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewerHasPermission(viewer, "rag.use")) forbidden();

  return <RagChat configured={hasRagConfig()} />;
}

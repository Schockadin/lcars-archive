import { redirect, forbidden } from "next/navigation";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { hasRagConfig } from "@/lib/rag";
import PageMeta from "@/components/PageMeta";
import RagChat from "./RagChat";

export const metadata = {
  title: {
    default: "Archiv-Assistent",
  },
};

// Hängt am eingeloggten Betrachter — nie statisch ausliefern.
export const dynamic = "force-dynamic";

export default async function RagPage() {
  // Erfordert Login (redirect) UND das Recht rag.use (forbidden) — dieselbe
  // Linie wie die übrigen gated Seiten (siehe src/lib/dal.ts). Anonyme
  // Betrachter (getViewer === null) landen auf /login.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewerHasPermission(viewer, "rag.use")) forbidden();

  const configured = hasRagConfig();

  return (
    <>
      <PageMeta title="Archiv-Assistent" section="rag" />
      <div className="w-full max-w-[720px]">
        <div className="mb-[16px]">
          <h1 className="lcars-data-row-heading">Archiv-Assistent</h1>
          <p className="lcars-eyebrow">
            Fragen an den Kampagnen-Datenbestand stellen
          </p>
        </div>
        <RagChat configured={configured} />
      </div>
    </>
  );
}

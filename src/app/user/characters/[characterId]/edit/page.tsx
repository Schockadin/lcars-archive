import { redirect } from "next/navigation";
import {
  characterEditHref,
} from "@/lib/contentRoutes";

// Alte Adresse: Werte und Stammdaten haben keine eigenen Seiten mehr, sondern
// sind Panels der Charakterseite. Bestehende Lesezeichen und Links landen
// deshalb dort.
export default async function LegacyEditPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  redirect(characterEditHref(characterId));
}

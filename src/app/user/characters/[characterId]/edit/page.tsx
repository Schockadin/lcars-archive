import { redirect } from "next/navigation";

// Alte Adresse: Werte und Stammdaten haben keine eigenen Seiten mehr, sondern
// sind Panels der Charakterseite. Bestehende Lesezeichen und Links landen
// deshalb dort.
export default async function LegacyEditPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  redirect(`/user/characters/${characterId}`);
}

import { redirect } from "next/navigation";
import { requireGM } from "@/lib/dal";

// /gm selbst hat keinen eigenen Inhalt — der Bereich wird über das
// Leitungs-Dropdown im Header betreten. Der Direktaufruf landet auf der
// Sessions-Übersicht, dem Ausgangspunkt des Spielleitungs-Alltags.
export default async function GmIndexPage() {
  await requireGM();
  redirect("/gm/sessions");
}

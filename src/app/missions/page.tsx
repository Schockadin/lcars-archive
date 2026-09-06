import { redirect } from "next/navigation";

// Die Missions-Übersicht ist in der Chronologie aufgegangen: dort steht in
// der Vorgabe je Einsatz sein Beginn, und jede Karte führt auf ihre
// Missionsseite (siehe TimelineView). Zwei Listen derselben Missionen — eine
// nach Datum, eine nach Datum — waren zwei Antworten auf dieselbe Frage.
//
// Die Route bleibt als Umleitung bestehen, statt zu verschwinden: sie steht
// in Lesezeichen, in der Sitemap und in älteren Verweisen. /missions/[slug]
// ist davon unberührt — die Detailseiten liegen weiterhin dort.
export default function MissionsPage() {
  redirect("/chronologie");
}

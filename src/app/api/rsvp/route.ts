import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/dal";
import { setRsvp } from "@/lib/plannedSessions";
import type { RsvpResponse } from "@/lib/plannedSessionTypes";

// Zu- und Absage zu einem angekündigten Spieltermin.
//
// Eine Route statt einer Server Action — dieselbe Ausnahme wie bei
// /api/news/seen und den Export-Routen, hier aus einem anderen Grund: Als
// Server Action war dies die EINZIGE Aktion des Archivs, die vom Dashboard
// (der Route "/") aus aufgerufen wurde, und genau sie scheiterte in der
// Netlify-Umgebung reproduzierbar mit einem 403 auf dem POST — im Browser als
// „An unexpected response was received from the server". Alle übrigen Aktionen
// (auf /gm, /user, den Inhaltsseiten) liefen unverändert; lokal, auch gegen
// einen Produktions-Build, war der Fehler nicht nachzustellen. Der Weg über
// eine gewöhnliche Route umgeht die Action-Zustellung an "/" vollständig: ein
// POST auf einen eigenen Pfad, ohne Action-Id und ohne die Prüfungen, die
// Next daran knüpft.
//
// Die Berechtigung wird hier genauso geprüft wie zuvor in der Action: eine
// Route ist ein öffentlicher Endpunkt, die Sichtbarkeit der Knöpfe sagt
// darüber nichts.
export async function POST(request: Request): Promise<Response> {
  const check = await checkPermission("users.browse");
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: 403 });
  }

  let body: { id?: unknown; response?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Unbekannter Termin." }, { status: 400 });
  }

  const response = String(body.response ?? "");
  if (response !== "yes" && response !== "no") {
    return NextResponse.json(
      { error: "Bitte zu- oder absagen." },
      { status: 400 },
    );
  }
  const note = String(body.note ?? "")
    .trim()
    .slice(0, 200);

  try {
    await setRsvp(id, check.user.id, response as RsvpResponse, note);
  } catch (error) {
    // Ein Datenbankfehler soll als lesbarer Satz am Knopf stehen, nicht als
    // kaputte Antwort — siehe die Vorgeschichte oben.
    console.error("POST /api/rsvp", error);
    return NextResponse.json(
      { error: "Die Antwort konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  // Beide Seiten neu bauen: die Startseite zeigt den Termin, die Verwaltung
  // unter /gm/sessions die Zu- und Absagen.
  revalidatePath("/");
  revalidatePath("/gm/sessions");
  return NextResponse.json({ ok: true, response });
}

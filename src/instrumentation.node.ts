import { type Instrumentation } from "next";

import { logServerError } from "@/lib/errorLog";
import { isRecoverableRenderError } from "@/lib/recoverableRenderErrors";

// Node-spezifische Implementierung des globalen Fehler-Hooks. Die Trennung
// von instrumentation.ts hält postgres und dessen Node-Built-ins vollständig
// aus dem parallel erzeugten Edge-Bundle heraus.

// Kaltstart einer Server-Instanz (Netlify-Function): Next ruft register()
// genau einmal auf, bevor die erste Anfrage bearbeitet wird. Der Aufbau der
// ersten DB-Verbindung (TCP + ggf. TLS + Anmeldung bei pgBouncer) wird hier
// schon angestoßen, aber NICHT abgewartet — er läuft parallel dazu, dass Next
// die Module der angefragten Route lädt, statt erst bei deren erster Abfrage
// zu beginnen. postgres.js (src/lib/db.ts) verbindet sonst lazy.
//
// Bewusst genau eine Verbindung: Mehr öffnet der Pool ohnehin selbst, sobald
// eine Seite parallel abfragt — vorab alle fünf aufzubauen hieße, dass jede
// kurz lebende Instanz (etwa für einen einzelnen /api/session-Aufruf) fünf
// Client-Verbindungen bei pgBouncer belegt.
//
// Nicht während `next build` (die Prerender-Worker laden instrumentation.ts
// ebenfalls) und nicht ohne DATABASE_URL. Ein Fehlschlag ist egal: Die erste
// echte Abfrage versucht es dann regulär erneut und meldet ihren Fehler selbst.
export function register(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) return;
  void import("@/lib/db")
    .then(({ default: sql }) => sql`SELECT 1`)
    .catch(() => {});
}
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const err = error as { digest?: string; message?: string; stack?: string };
  const message = err.message ?? String(error);

  // Von React selbst wieder aufgefangene Render-Fehler (PPR-Resume, siehe
  // @/lib/recoverableRenderErrors) sind kein Absturz: Die Antwort geht raus,
  // React rendert den betroffenen Teil nur im Browser statt auf dem Server.
  // Sie kämen sonst als „Server Action" auf „/" immer wieder ins Protokoll
  // und verdeckten dort die echten Fehler.
  if (isRecoverableRenderError(message)) return;

  await logServerError({
    digest: err.digest,
    message,
    stack: err.stack,
    routePath: context.routePath,
    routeType: context.routeType,
    method: request.method,
  });
};

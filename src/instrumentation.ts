// Next.js' dokumentierter, seit v15.0.0 stabiler Hook für Server-seitiges
// Fehler-Tracking (siehe node_modules/next/dist/docs/01-app/03-api-reference/
// 03-file-conventions/instrumentation.md) — deckt Server Components
// (routeType "render"), Route Handlers ("route") und Server Actions
// ("action") über einen einzigen Callback ab. onRequestError wird von
// Next.js selbst aufgerufen, wenn ein Fehler NICHT bereits an Ort und
// Stelle abgefangen wurde (bereits abgefangene Fehler, die dem User als
// {error: "..."} zurückgegeben werden, erreichen diesen Hook nie — richtig
// so, das ist erwartetes Verhalten, kein Absturz).
//
// error.digest (siehe error.tsx/global-error.tsx) ist der Korrelations-
// Schlüssel: Next.js redigiert bei Server-Component-Fehlern die echte
// Meldung auf der Seite selbst, hier im Hook liegt sie noch im Klartext vor.
import { type Instrumentation } from "next";
// Reines Prädikat ohne DB-/Server-Abhängigkeit — anders als @/lib/errorLog
// unten darf es direkt importiert werden.
import { isRecoverableRenderError } from "@/lib/recoverableRenderErrors";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Next baut instrumentation.ts für Node.js und Edge. Der DB-Logger hängt
  // vom Node-Modul "net" ab und darf deshalb nicht in den Edge-Modulgraphen
  // geraten. NEXT_RUNTIME wird von Next beim Bundeln konstant ersetzt, sodass
  // Webpack den darunterliegenden dynamischen Import im Edge-Bundle entfernt.
  if (process.env.NEXT_RUNTIME === "edge") return;

  const err = error as { digest?: string; message?: string; stack?: string };
  const message = err.message ?? String(error);

  // Von React selbst wieder aufgefangene Render-Fehler (PPR-Resume, siehe
  // @/lib/recoverableRenderErrors) sind kein Absturz: Die Antwort geht raus,
  // React rendert den betroffenen Teil nur im Browser statt auf dem Server.
  // Sie kämen sonst als „Server Action" auf „/" immer wieder ins Protokoll
  // und verdeckten dort die echten Fehler.
  if (isRecoverableRenderError(message)) return;

  // Dynamischer statt Top-Level-Import: hält diese Datei minimal und
  // verhindert, dass ein Fehler beim Laden von @/lib/db (z.B. fehlende
  // DATABASE_URL) das Registrieren von instrumentation.ts selbst stört.
  const { logServerError } = await import("@/lib/errorLog");
  await logServerError({
    digest: err.digest,
    message,
    stack: err.stack,
    routePath: context.routePath,
    routeType: context.routeType,
    method: request.method,
  });
};

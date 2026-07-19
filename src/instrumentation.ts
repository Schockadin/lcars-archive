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

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Dynamischer statt Top-Level-Import: hält diese Datei minimal und
  // verhindert, dass ein Fehler beim Laden von @/lib/db (z.B. fehlende
  // DATABASE_URL) das Registrieren von instrumentation.ts selbst stört.
  const { logServerError } = await import("@/lib/errorLog");
  const err = error as { digest?: string; message?: string; stack?: string };
  await logServerError({
    digest: err.digest,
    message: err.message ?? String(error),
    stack: err.stack,
    routePath: context.routePath,
    routeType: context.routeType,
    method: request.method,
  });
};

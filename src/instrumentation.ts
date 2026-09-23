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

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  // Next baut instrumentation.ts für Node.js und Edge. Der DB-Logger hängt
  // vom Node-Modul "net" ab und darf deshalb nicht in den Edge-Modulgraphen
  // geraten. Das bedingte require() ist das von Next dokumentierte Muster für
  // runtime-spezifische Instrumentation; Webpack entfernt den Node-Zweig,
  // bevor es dessen Abhängigkeiten für das Edge-Bundle auflöst.
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  } else {
    const nodeInstrumentation = require("./instrumentation.node") as {
      onRequestError: Instrumentation.onRequestError;
    };
    return nodeInstrumentation.onRequestError(...args);
  }
};

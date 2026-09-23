import { type Instrumentation } from "next";

import { logServerError } from "@/lib/errorLog";
import { isRecoverableRenderError } from "@/lib/recoverableRenderErrors";

// Node-spezifische Implementierung des globalen Fehler-Hooks. Die Trennung
// von instrumentation.ts hält postgres und dessen Node-Built-ins vollständig
// aus dem parallel erzeugten Edge-Bundle heraus.
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

"use client";
import { useEffect, useRef } from "react";
import {
  reportErrorPageDisplay,
  type ErrorPageStatus,
} from "@/app/actions/errorPages";

// Rendert nichts. Der Mount selbst ist das Signal: Nicht nur irgendwo im
// Server ist ein Fehler aufgetreten, sondern eine Person hat tatsächlich eine
// Fehlerseite gesehen. Der Ref verhindert doppelte Einträge durch Reacts
// Development-Effektwiederholung, lässt aber einen neuen Fehler/Digest durch.
export default function ErrorPageReporter({
  status,
  error,
}: {
  status: ErrorPageStatus;
  error?: Error & { digest?: string };
}) {
  const lastReport = useRef<string | null>(null);

  useEffect(() => {
    const routePath = `${window.location.pathname}${window.location.search}`;
    const report = {
      status,
      digest: error?.digest,
      message: error?.message,
      stack: error?.stack,
      routePath,
    };
    const signature = JSON.stringify(report);
    if (lastReport.current === signature) return;
    lastReport.current = signature;

    // Logging darf die ohnehin bereits angezeigte Fehlerseite niemals erneut
    // in eine Fehlergrenze werfen. logServerError ist serverseitig ebenfalls
    // defensiv gekapselt; catch deckt Transport-/Action-Fehler ab.
    void reportErrorPageDisplay(report).catch(() => undefined);
  }, [error, status]);

  return null;
}

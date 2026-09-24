"use server";
import { logServerError } from "@/lib/errorLog";

export type ErrorPageStatus = 403 | 404 | 500;

export interface ErrorPageDisplayReport {
  status: ErrorPageStatus;
  digest?: string;
  message?: string;
  stack?: string;
  routePath?: string;
}

const ALLOWED_STATUSES = new Set<ErrorPageStatus>([403, 404, 500]);

function limitedText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

// Wird von der tatsächlich gerenderten Fehlerseite aufgerufen. Das ergänzt
// Nexts onRequestError-Hook: Der protokolliert den auslösenden Serverfehler,
// während dieser Eintrag festhält, dass ein Fallback beim User angekommen ist.
// 403/404 haben naturgemäß kein Error-Objekt; auch der 500er kann in
// Produktion nur Digest oder gar keine konkrete Meldung mitbringen.
export async function reportErrorPageDisplay(
  report: ErrorPageDisplayReport,
): Promise<void> {
  if (!ALLOWED_STATUSES.has(report.status)) return;

  const message =
    limitedText(report.message, 4_000) ??
    `Fehlerseite ${report.status} wurde ohne konkrete Fehlermeldung angezeigt.`;

  await logServerError({
    digest: limitedText(report.digest, 500),
    message,
    stack: limitedText(report.stack, 20_000),
    routePath: limitedText(report.routePath, 2_000),
    routeType: "error-page",
    method: "GET",
  });
}

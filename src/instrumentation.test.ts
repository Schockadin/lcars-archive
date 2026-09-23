import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logServerError = vi.fn();
vi.mock("@/lib/errorLog", () => ({ logServerError }));

import { onRequestError } from "./instrumentation";

// Minimal-Stellvertreter für die beiden Argumente, die Next dem Hook neben
// dem Fehler übergibt.
const request = { method: "POST" } as Parameters<typeof onRequestError>[1];
const context = {
  routePath: "/",
  routeType: "action",
} as Parameters<typeof onRequestError>[2];

describe("onRequestError", () => {
  beforeEach(() => logServerError.mockClear());
  afterEach(() => vi.unstubAllEnvs());

  it("protokolliert einen echten Serverfehler", async () => {
    const error = new Error("Datenbank nicht erreichbar");
    await onRequestError(error, request, context);

    expect(logServerError).toHaveBeenCalledTimes(1);
    expect(logServerError.mock.calls[0][0]).toMatchObject({
      message: "Datenbank nicht erreichbar",
      routePath: "/",
      routeType: "action",
      method: "POST",
    });
  });

  it("überspringt den von React aufgefangenen Resume-Fehler", async () => {
    const error = new Error(
      "Couldn't find all resumable slots by key/index during replaying. " +
        "The tree doesn't match so React will fallback to client rendering.",
    );
    await onRequestError(error, request, context);

    expect(logServerError).not.toHaveBeenCalled();
  });

  it("lädt den Node-Logger nicht in der Edge-Runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");

    await onRequestError(new Error("Edge-Fehler"), request, context);

    expect(logServerError).not.toHaveBeenCalled();
  });
});

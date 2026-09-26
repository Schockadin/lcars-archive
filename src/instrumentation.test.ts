import { beforeEach, describe, expect, it, vi } from "vitest";

const { logServerError } = vi.hoisted(() => ({ logServerError: vi.fn() }));
vi.mock("@/lib/errorLog", () => ({ logServerError }));

// Stellvertreter für den postgres.js-Client: ein Tagged-Template-Aufruf.
const { sql } = vi.hoisted(() => ({
  sql: vi.fn(async () => [{ "?column?": 1 }]),
}));
vi.mock("@/lib/db", () => ({ default: sql }));

import { onRequestError, register } from "./instrumentation.node";

// Minimal-Stellvertreter für die beiden Argumente, die Next dem Hook neben
// dem Fehler übergibt.
const request = { method: "POST" } as Parameters<typeof onRequestError>[1];
const context = {
  routePath: "/",
  routeType: "action",
} as Parameters<typeof onRequestError>[2];

describe("onRequestError", () => {
  beforeEach(() => logServerError.mockClear());

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
});

describe("register (DB-Verbindung beim Kaltstart vorwärmen)", () => {
  beforeEach(() => {
    sql.mockClear();
    vi.unstubAllEnvs();
  });

  // Der Aufruf ist bewusst fire-and-forget. Positive Fälle warten per
  // vi.waitFor auf den dynamischen Import; für die Abbruchfälle genügt eine
  // Runde der Ereignisschleife, weil register() dort gar nicht erst importiert.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("stößt beim Serverstart genau eine Abfrage an", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:5432/db");
    vi.stubEnv("NEXT_PHASE", "");
    register();

    await vi.waitFor(() => expect(sql).toHaveBeenCalledTimes(1));
  });

  it("verbindet während next build nicht", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:5432/db");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    register();
    await flush();

    expect(sql).not.toHaveBeenCalled();
  });

  it("verbindet ohne DATABASE_URL nicht", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXT_PHASE", "");
    register();
    await flush();

    expect(sql).not.toHaveBeenCalled();
  });

  it("verschluckt einen Verbindungsfehler", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@127.0.0.1:5432/db");
    vi.stubEnv("NEXT_PHASE", "");
    sql.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    expect(() => register()).not.toThrow();
    await vi.waitFor(() => expect(sql).toHaveBeenCalledTimes(1));
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { logServerError } = vi.hoisted(() => ({ logServerError: vi.fn() }));
vi.mock("@/lib/errorLog", () => ({ logServerError }));

import { reportErrorPageDisplay } from "./errorPages";

describe("reportErrorPageDisplay", () => {
  beforeEach(() => logServerError.mockReset());

  it("schreibt auch ohne konkrete Meldung einen eindeutigen 500er-Eintrag", async () => {
    await reportErrorPageDisplay({
      status: 500,
      message: "   ",
      routePath: "/kaputt",
    });

    expect(logServerError).toHaveBeenCalledWith({
      digest: undefined,
      message: "Fehlerseite 500 wurde ohne konkrete Fehlermeldung angezeigt.",
      stack: undefined,
      routePath: "/kaputt",
      routeType: "error-page",
      method: "GET",
    });
  });

  it("übernimmt vorhandene Fehlerdetails für die angezeigte Seite", async () => {
    await reportErrorPageDisplay({
      status: 500,
      digest: "abc123",
      message: "Datenbank nicht erreichbar",
      stack: "Error: Datenbank nicht erreichbar",
      routePath: "/user",
    });

    expect(logServerError).toHaveBeenCalledWith(
      expect.objectContaining({
        digest: "abc123",
        message: "Datenbank nicht erreichbar",
        stack: "Error: Datenbank nicht erreichbar",
        routePath: "/user",
        routeType: "error-page",
      }),
    );
  });

  it("ignoriert manipulierte Statuscodes", async () => {
    await reportErrorPageDisplay({
      status: 418,
    } as unknown as Parameters<typeof reportErrorPageDisplay>[0]);

    expect(logServerError).not.toHaveBeenCalled();
  });
});

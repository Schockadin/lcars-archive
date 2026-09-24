import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const { reportErrorPageDisplay } = vi.hoisted(() => ({
  reportErrorPageDisplay: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/actions/errorPages", () => ({ reportErrorPageDisplay }));

import ErrorPageReporter from "./ErrorPageReporter";

describe("ErrorPageReporter", () => {
  beforeEach(() => {
    reportErrorPageDisplay.mockClear();
    window.history.replaceState({}, "", "/fehlend?aus=profil");
  });

  it("protokolliert auch eine Fehlerseite ohne Error-Objekt", async () => {
    render(<ErrorPageReporter status={404} />);

    await waitFor(() =>
      expect(reportErrorPageDisplay).toHaveBeenCalledWith({
        status: 404,
        digest: undefined,
        message: undefined,
        stack: undefined,
        routePath: "/fehlend?aus=profil",
      }),
    );
  });

  it("reicht die Details eines 500ers weiter und meldet denselben Mount nur einmal", async () => {
    const error = Object.assign(new Error("Render fehlgeschlagen"), {
      digest: "digest-500",
    });
    const { rerender } = render(
      <ErrorPageReporter status={500} error={error} />,
    );

    await waitFor(() =>
      expect(reportErrorPageDisplay).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          digest: "digest-500",
          message: "Render fehlgeschlagen",
          routePath: "/fehlend?aus=profil",
        }),
      ),
    );

    rerender(<ErrorPageReporter status={500} error={error} />);
    expect(reportErrorPageDisplay).toHaveBeenCalledTimes(1);
  });
});

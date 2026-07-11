import { describe, it, expect, vi, afterEach } from "vitest";
import { confirmSubmit } from "./confirmSubmit";

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as {
    preventDefault: () => void;
  };
}

describe("confirmSubmit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the given message via window.confirm", () => {
    const confirmSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirmSpy);

    confirmSubmit("Wirklich löschen?")(fakeEvent() as never);

    expect(confirmSpy).toHaveBeenCalledWith("Wirklich löschen?");
  });

  it("does not prevent the default action when the user confirms", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const event = fakeEvent();

    confirmSubmit("Wirklich löschen?")(event as never);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("prevents the default action when the user cancels", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const event = fakeEvent();

    confirmSubmit("Wirklich löschen?")(event as never);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});

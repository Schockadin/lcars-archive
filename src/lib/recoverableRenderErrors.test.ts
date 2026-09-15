import { describe, it, expect } from "vitest";
import { isRecoverableRenderError } from "./recoverableRenderErrors";

describe("isRecoverableRenderError", () => {
  it("erkennt die fehlenden Resume-Slots (der Fall aus dem Protokoll)", () => {
    expect(
      isRecoverableRenderError(
        "Couldn't find all resumable slots by key/index during replaying. " +
          "The tree doesn't match so React will fallback to client rendering.",
      ),
    ).toBe(true);
  });

  it("erkennt die zweite Resume-Meldung (falscher Knoten im Slot)", () => {
    expect(
      isRecoverableRenderError(
        "Expected the resume to render <div> in this slot but instead it " +
          "rendered <span>. The tree doesn't match so React will fallback to " +
          "client rendering.",
      ),
    ).toBe(true);
  });

  it("lässt echte Serverfehler durch", () => {
    expect(
      isRecoverableRenderError("Cannot read properties of undefined"),
    ).toBe(false);
    // Eine Meldung, die nur „React" erwähnt, reicht nicht — sonst
    // verschwänden mit der Zeit Fehler aus dem Protokoll, die dorthin
    // gehören.
    expect(
      isRecoverableRenderError("React rendering failed on the server"),
    ).toBe(false);
  });
});

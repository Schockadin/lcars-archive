import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  REPLY_DOCK_STICKY_KEY,
  readReplyDockSticky,
  writeReplyDockSticky,
} from "./replyDockPreference";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("replyDockPreference", () => {
  it("ist ohne gespeicherte Wahl angeheftet", () => {
    expect(readReplyDockSticky()).toBe(true);
  });

  it("merkt sich das Abwählen und das Wiederanheften", () => {
    writeReplyDockSticky(false);
    expect(window.localStorage.getItem(REPLY_DOCK_STICKY_KEY)).toBe("0");
    expect(readReplyDockSticky()).toBe(false);

    writeReplyDockSticky(true);
    expect(readReplyDockSticky()).toBe(true);
  });

  // Privates Fenster/gesperrte Websitedaten: Der Zugriff selbst wirft.
  it("fällt auf die Vorgabe zurück, wenn der Speicher nicht zu haben ist", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(readReplyDockSticky()).toBe(true);
    expect(() => writeReplyDockSticky(false)).not.toThrow();
  });
});

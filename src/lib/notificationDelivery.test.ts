import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { logCaughtError } = vi.hoisted(() => ({ logCaughtError: vi.fn() }));
vi.mock("@/lib/errorLog", () => ({ logCaughtError }));

import { deliverNotifications } from "./notificationDelivery";

const recipient = {
  id: 7,
  email: "test@example.test",
  name: "Test",
  emailNotificationsEnabled: true,
  pushNotificationsEnabled: true,
};

describe("deliverNotifications", () => {
  beforeEach(() => {
    logCaughtError.mockClear();
  });

  it("respektiert Kanal-Opt-ins", async () => {
    const sendEmail = vi.fn(async () => ({ sent: true }));
    const sendPush = vi.fn(async () => undefined);

    await deliverNotifications(
      [recipient, { ...recipient, id: 8, emailNotificationsEnabled: false }],
      {
        context: "test",
        emailFailureLabel: "Test-Mail",
        sendEmail,
        sendPush,
      },
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendPush).toHaveBeenCalledTimes(2);
  });

  it("loggt einen fehlgeschlagenen Kanal und setzt die Zustellung fort", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await deliverNotifications([recipient], {
      context: "test-context",
      emailFailureLabel: "Test-Mail",
      sendEmail: async () => ({ sent: false, error: "kaputt" }),
      sendPush: async () => undefined,
    });

    expect(logCaughtError).toHaveBeenCalledWith(
      expect.any(Error),
      "test-context",
    );
    consoleError.mockRestore();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const checkPermission = vi.fn();
const getPlannedSession = vi.fn();
const getPlannedSessionPlayers = vi.fn();
const sendPlannedSessionReminderEmail = vi.fn();
const getBaseUrl = vi.fn();
const logCaughtError = vi.fn();

vi.mock("@/lib/dal", () => ({
  checkPermission: (permission: string) => checkPermission(permission),
}));
vi.mock("@/lib/plannedSessions", () => ({
  getPlannedSession: (...args: unknown[]) => getPlannedSession(...args),
  getPlannedSessionPlayers: (...args: unknown[]) =>
    getPlannedSessionPlayers(...args),
}));
vi.mock("@/lib/mail", () => ({
  sendPlannedSessionReminderEmail: (...args: unknown[]) =>
    sendPlannedSessionReminderEmail(...args),
}));
vi.mock("@/lib/http", () => ({ getBaseUrl: () => getBaseUrl() }));
vi.mock("@/lib/errorLog", () => ({
  logCaughtError: (...args: unknown[]) => logCaughtError(...args),
}));

import { POST } from "./route";

function anfrage(body: unknown): Request {
  return new Request("http://localhost/api/planned-session-reminder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function geplanterTermin(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    scheduledAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    title: "Nebel von Ceti 1",
    location: "Bei Anna",
    characterIds: [4, 8],
    gameSessionId: null,
    participants: [
      { userId: 1, userName: "Anna", response: null },
      { userId: 2, userName: "Bert", response: null },
      { userId: 3, userName: "Cleo", response: "yes" },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  checkPermission.mockReset();
  getPlannedSession.mockReset();
  getPlannedSessionPlayers.mockReset();
  sendPlannedSessionReminderEmail.mockReset();
  getBaseUrl.mockReset();
  logCaughtError.mockReset();
});

describe("POST /api/planned-session-reminder", () => {
  it("erfordert das GM-Recht", async () => {
    checkPermission.mockResolvedValue({ error: "GM-Recht erforderlich." });

    const response = await POST(anfrage({ id: 12 }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "GM-Recht erforderlich." });
    expect(getPlannedSession).not.toHaveBeenCalled();
  });

  it("erinnert nur offene User mit aktivierter Mail-Benachrichtigung", async () => {
    checkPermission.mockResolvedValue({ user: { id: 9 } });
    getPlannedSession.mockResolvedValue(geplanterTermin());
    getPlannedSessionPlayers.mockResolvedValue([
      {
        id: 1,
        email: "anna@example.com",
        name: "Anna",
        emailNotificationsEnabled: true,
        characterNames: ["Tuvok"],
      },
      {
        id: 2,
        email: "bert@example.com",
        name: "Bert",
        emailNotificationsEnabled: false,
        characterNames: ["Shran"],
      },
      {
        id: 3,
        email: "cleo@example.com",
        name: "Cleo",
        emailNotificationsEnabled: true,
        characterNames: ["Kim"],
      },
    ]);
    sendPlannedSessionReminderEmail.mockResolvedValue({ sent: true });
    getBaseUrl.mockResolvedValue("https://neo-archiv.example");

    const response = await POST(anfrage({ id: 12 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sent: 1, skipped: 1, failed: 0 });
    expect(getPlannedSessionPlayers).toHaveBeenCalledWith([4, 8]);
    expect(sendPlannedSessionReminderEmail).toHaveBeenCalledTimes(1);
    expect(sendPlannedSessionReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "anna@example.com",
        name: "Anna",
        sessionTitle: "Nebel von Ceti 1",
        location: "Bei Anna",
        dashboardUrl: "https://neo-archiv.example",
      }),
    );
    expect(getBaseUrl).toHaveBeenCalledOnce();
  });

  it("versendet keine Erinnerung für einen eingetragenen oder vergangenen Termin", async () => {
    checkPermission.mockResolvedValue({ user: { id: 9 } });
    getPlannedSession.mockResolvedValue(
      geplanterTermin({ gameSessionId: 77 }),
    );

    const response = await POST(anfrage({ id: 12 }));

    expect(response.status).toBe(409);
    expect(getPlannedSessionPlayers).not.toHaveBeenCalled();
    expect(sendPlannedSessionReminderEmail).not.toHaveBeenCalled();
  });

  it("weist ungültige Termine-IDs ab", async () => {
    checkPermission.mockResolvedValue({ user: { id: 9 } });

    const response = await POST(anfrage({ id: "unbekannt" }));

    expect(response.status).toBe(400);
    expect(getPlannedSession).not.toHaveBeenCalled();
  });
});

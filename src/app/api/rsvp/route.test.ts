import { describe, it, expect, vi, beforeEach } from "vitest";

// Die Zu-/Absage läuft seit v1.29.52 über eine Route statt über eine Server
// Action (Begründung in route.ts). Geprüft wird hier, was vorher die Action
// prüfte: fehlendes Recht, gültige Eingabe, Datenbankfehler — jeweils als
// Antwort mit Status, nicht als Absturz.

const checkPermission = vi.fn();
const setRsvp = vi.fn();

vi.mock("@/lib/dal", () => ({
  checkPermission: (permission: string) => checkPermission(permission),
}));
vi.mock("@/lib/plannedSessions", () => ({
  setRsvp: (...args: unknown[]) => setRsvp(...args),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { POST } from "./route";

function anfrage(body: unknown): Request {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  checkPermission.mockReset();
  setRsvp.mockReset();
});

describe("POST /api/rsvp", () => {
  it("antwortet mit 403 und Meldung, wenn das Recht fehlt", async () => {
    checkPermission.mockResolvedValue({ error: "Dir fehlt die Berechtigung." });

    const res = await POST(anfrage({ id: 1, response: "yes" }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Dir fehlt die Berechtigung." });
    expect(setRsvp).not.toHaveBeenCalled();
  });

  it("speichert die Zusage", async () => {
    checkPermission.mockResolvedValue({ user: { id: 7 } });

    const res = await POST(anfrage({ id: 3, response: "yes" }));

    expect(res.status).toBe(200);
    expect(setRsvp).toHaveBeenCalledWith(3, 7, "yes", "");
  });

  it("weist eine Antwort ab, die weder Zu- noch Absage ist", async () => {
    checkPermission.mockResolvedValue({ user: { id: 7 } });

    const res = await POST(anfrage({ id: 3, response: "vielleicht" }));

    expect(res.status).toBe(400);
    expect(setRsvp).not.toHaveBeenCalled();
  });

  it("meldet einen Datenbankfehler als Satz, statt zu werfen", async () => {
    checkPermission.mockResolvedValue({ user: { id: 7 } });
    setRsvp.mockRejectedValue(new Error("relation does not exist"));

    const res = await POST(anfrage({ id: 3, response: "no" }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("konnte nicht gespeichert");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Die Zusage ist die einzige Action, die JEDE angemeldete Person auslöst —
// und sie hing an requireNonGuest, dem harten Gate. Fehlt der Rolle das Recht
// „Nicht-Gast" (users.browse), rief das forbidden() auf; in einer über
// useActionState aufgerufenen Action wird daraus eine 403-Antwort, mit der der
// Client nichts anfangen kann („An unexpected response was received from the
// server"). Dieser Test hält fest, dass daraus ein lesbarer Satz wird.

const checkPermission = vi.fn();
const setRsvp = vi.fn();

vi.mock("@/lib/dal", () => ({
  checkPermission: (permission: string) => checkPermission(permission),
  requireGM: vi.fn(),
}));
vi.mock("@/lib/plannedSessions", () => ({
  setRsvp: (...args: unknown[]) => setRsvp(...args),
  createPlannedSession: vi.fn(),
  updatePlannedSession: vi.fn(),
  deletePlannedSession: vi.fn(),
}));
vi.mock("@/lib/gameSessions", () => ({ listActiveCharactersForAp: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { setRsvpAction } from "./plannedSessions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  checkPermission.mockReset();
  setRsvp.mockReset();
});

describe("setRsvpAction", () => {
  it("antwortet mit einer Meldung, wenn das Recht fehlt", async () => {
    checkPermission.mockResolvedValue({ error: "Dir fehlt die Berechtigung." });

    const result = await setRsvpAction({}, form({ id: "1", response: "yes" }));

    expect(result.error).toBe("Dir fehlt die Berechtigung.");
    expect(setRsvp).not.toHaveBeenCalled();
  });

  it("speichert die Zusage, wenn das Recht da ist", async () => {
    checkPermission.mockResolvedValue({ user: { id: 7 } });

    const result = await setRsvpAction({}, form({ id: "3", response: "yes" }));

    expect(setRsvp).toHaveBeenCalledWith(3, 7, "yes", "");
    expect(result.success).toBe("Zugesagt.");
  });

  it("meldet einen Datenbankfehler, statt die Seite mitzureißen", async () => {
    checkPermission.mockResolvedValue({ user: { id: 7 } });
    setRsvp.mockRejectedValue(new Error("relation does not exist"));

    const result = await setRsvpAction({}, form({ id: "3", response: "no" }));

    expect(result.error).toContain("konnte nicht gespeichert werden");
  });
});

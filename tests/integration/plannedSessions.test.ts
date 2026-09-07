import { describe, it, expect, vi } from "vitest";
import sql from "@/lib/db";
import {
  createPlannedSession,
  deletePlannedSession,
  listAllPlannedSessions,
  listUpcomingSessions,
  setRsvp,
  updatePlannedSession,
  getPlannedSession,
  linkPlannedSession,
} from "@/lib/plannedSessions";
import { insertUser, insertCharacter } from "./helpers";

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

function inTagen(tage: number): string {
  const d = new Date(Date.now() + tage * 86400000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

describe("Session-Planer", () => {
  it("führt anstehende Termine, den nächsten zuerst", async () => {
    const gm = await insertUser();
    await createPlannedSession(
      { scheduledAt: inTagen(14), title: "Später", location: "", notes: "", characterIds: [] },
      gm.id,
    );
    await createPlannedSession(
      { scheduledAt: inTagen(3), title: "Bald", location: "Bei Anna", notes: "", characterIds: [] },
      gm.id,
    );

    const sessions = await listUpcomingSessions();
    expect(sessions.map((s) => s.title)).toEqual(["Bald", "Später"]);
    expect(sessions[0].location).toBe("Bei Anna");
  });

  it("lässt einen Termin erst sechs Stunden nach Beginn verschwinden", async () => {
    // Sonst fiele der Abend mitten im Spielen aus der Liste.
    const gm = await insertUser();
    await createPlannedSession(
      { scheduledAt: inTagen(-0.1), title: "Läuft gerade", location: "", notes: "", characterIds: [] },
      gm.id,
    );
    await createPlannedSession(
      { scheduledAt: inTagen(-2), title: "Vorbei", location: "", notes: "", characterIds: [] },
      gm.id,
    );

    expect((await listUpcomingSessions()).map((s) => s.title)).toEqual([
      "Läuft gerade",
    ]);
    // Die Spielleitung sieht auch die vergangenen.
    expect((await listAllPlannedSessions()).map((s) => s.title)).toEqual([
      "Läuft gerade",
      "Vorbei",
    ]);
  });

  it("nimmt Zu- und Absagen an und lässt sie ändern", async () => {
    const gm = await insertUser();
    const spielerin = await insertUser();
    const id = await createPlannedSession(
      { scheduledAt: inTagen(5), title: "Termin", location: "", notes: "", characterIds: [] },
      gm.id,
    );

    await setRsvp(id, spielerin.id, "yes", "bringe Kuchen mit");
    let [session] = await listUpcomingSessions();
    expect(session.rsvps).toHaveLength(1);
    expect(session.rsvps[0]).toMatchObject({
      userId: spielerin.id,
      response: "yes",
      note: "bringe Kuchen mit",
    });

    // Man darf es sich anders überlegen — die zweite Antwort ersetzt die erste.
    await setRsvp(id, spielerin.id, "no", "");
    [session] = await listUpcomingSessions();
    expect(session.rsvps).toHaveLength(1);
    expect(session.rsvps[0].response).toBe("no");
  });

  it("räumt die Antworten mit dem Termin ab", async () => {
    const gm = await insertUser();
    const spielerin = await insertUser();
    const id = await createPlannedSession(
      { scheduledAt: inTagen(5), title: "Termin", location: "", notes: "", characterIds: [] },
      gm.id,
    );
    await setRsvp(id, spielerin.id, "yes", "");

    await deletePlannedSession(id);
    expect(
      await sql`SELECT session_id FROM planned_session_rsvps WHERE session_id = ${id}`,
    ).toHaveLength(0);
  });

  it("ändert einen Termin, ohne die Zusagen zu verlieren", async () => {
    // Eine verschobene Uhrzeit macht die Zusagen nicht ungültig.
    const gm = await insertUser();
    const spielerin = await insertUser();
    const id = await createPlannedSession(
      { scheduledAt: inTagen(5), title: "Alt", location: "", notes: "", characterIds: [] },
      gm.id,
    );
    await setRsvp(id, spielerin.id, "yes", "");

    await updatePlannedSession(id, {
      scheduledAt: inTagen(6),
      title: "Neu",
      location: "Woanders",
      notes: "eine Stunde später",
      characterIds: [],
    });

    const [session] = await listUpcomingSessions();
    expect(session.title).toBe("Neu");
    expect(session.location).toBe("Woanders");
    expect(session.rsvps).toHaveLength(1);
  });

  it("merkt sich, wer eingeplant ist — und ändert die Besetzung mit", async () => {
    const gm = await insertUser();
    const a = await insertCharacter({ name: "Tuvok" });
    const b = await insertCharacter({ name: "Kim" });
    const id = await createPlannedSession(
      {
        scheduledAt: inTagen(5),
        title: "Termin",
        location: "",
        notes: "",
        characterIds: [a.id, b.id],
      },
      gm.id,
    );

    let session = await getPlannedSession(id);
    expect(session?.characterIds.sort()).toEqual([a.id, b.id].sort());

    // Wer absagt, fliegt aus der Besetzung — die übrige bleibt stehen.
    await updatePlannedSession(id, {
      scheduledAt: inTagen(5),
      title: "Termin",
      location: "",
      notes: "",
      characterIds: [a.id],
    });
    session = await getPlannedSession(id);
    expect(session?.characterIds).toEqual([a.id]);

    // Und eine leere Besetzung ist auch eine Aussage.
    await updatePlannedSession(id, {
      scheduledAt: inTagen(5),
      title: "Termin",
      location: "",
      notes: "",
      characterIds: [],
    });
    session = await getPlannedSession(id);
    expect(session?.characterIds).toEqual([]);
  });

  it("nimmt einen eingetragenen Termin von der Startseite", async () => {
    // Aus dem Termin ist eine gespielte Session geworden: die Spielleitung
    // sieht ihn weiter (mit den Zusagen), die Runde nicht mehr.
    const gm = await insertUser();
    const id = await createPlannedSession(
      {
        scheduledAt: inTagen(2),
        title: "Gespielt",
        location: "",
        notes: "",
        characterIds: [],
      },
      gm.id,
    );
    const [gameSession] = await sql<{ id: number }[]>`
      INSERT INTO game_sessions (session_date, title, session_ap, bonus_ap, notes, created_by)
      VALUES ('2026-06-12', 'Gespielt', 0, 0, '', ${gm.id})
      RETURNING id
    `;

    await linkPlannedSession(id, gameSession.id);

    expect((await listUpcomingSessions()).map((s) => s.title)).not.toContain(
      "Gespielt",
    );
    expect((await getPlannedSession(id))?.gameSessionId).toBe(gameSession.id);

    // Wird die Session zurückgenommen, steht der Termin wieder als offen da.
    await sql`DELETE FROM game_sessions WHERE id = ${gameSession.id}`;
    expect((await getPlannedSession(id))?.gameSessionId).toBeNull();
    expect((await listUpcomingSessions()).map((s) => s.title)).toContain(
      "Gespielt",
    );
  });
});

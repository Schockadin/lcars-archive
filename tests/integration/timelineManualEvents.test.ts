import { describe, it, expect, vi } from "vitest";
import sql from "@/lib/db";
import {
  createManualEvent,
  deleteManualEvent,
  listCharactersForEvents,
} from "@/lib/timelineManualEvents";
import { getTimeline } from "@/lib/timeline";
import { insertUser, insertCharacter, insertMission } from "./helpers";

// Ereignisse ohne eigenen Inhalt (origin 'manual') liegen in derselben
// Tabelle wie die abgeleiteten, hängen aber an keiner Quelle.
//
// next/cache läuft nur im Next-Request-Kontext (revalidateTag wirft sonst) —
// hier geht es um die Datenbank, nicht um die Invalidierung. Dieselbe
// Attrappe wie in characterWorkflow.test.ts.
vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

describe("freie Chronologie-Ereignisse", () => {
  it("erscheinen in der Chronologie, ohne Quelle und ohne Link", async () => {
    const user = await insertUser();
    await createManualEvent(
      {
        date: "2399-11-02",
        title: "Vertrag von Algeron",
        detail: "Die Grenze wird festgeschrieben.",
        category: "political",
        characterIds: [],
      },
      user.id,
    );

    // Auch für jemanden ohne Konto: das Ereignis hängt an keinem Inhalt, es
    // gibt also keine Sichtbarkeit, die etwas verbergen könnte.
    const events = await getTimeline(null);
    const event = events.find((e) => e.title === "Vertrag von Algeron");
    expect(event).toBeDefined();
    expect(event!.origin).toBe("manual");
    expect(event!.href).toBeNull();
    expect(event!.detail).toBe("Die Grenze wird festgeschrieben.");
  });

  it("lässt sich von der eintragenden Person wieder entfernen", async () => {
    const user = await insertUser();
    const id = await createManualEvent(
      { date: "2400-01-01", title: "Weg damit", detail: null, category: "other", characterIds: [] },
      user.id,
    );

    expect(
      await deleteManualEvent(id, { userId: user.id, canModerate: false }),
    ).toBe(true);
    expect(await sql`SELECT id FROM timeline_events WHERE id = ${id}`).toHaveLength(0);
  });

  it("schützt fremde Ereignisse vor allen außer der Moderation", async () => {
    const autor = await insertUser();
    const fremd = await insertUser();
    const id = await createManualEvent(
      { date: "2400-01-01", title: "Meins", detail: null, category: "other", characterIds: [] },
      autor.id,
    );

    expect(
      await deleteManualEvent(id, { userId: fremd.id, canModerate: false }),
    ).toBe(false);
    expect(
      await deleteManualEvent(id, { userId: fremd.id, canModerate: true }),
    ).toBe(true);
  });

  it("nimmt Beteiligte auf und zeigt sie an der Karte", async () => {
    const user = await insertUser();
    const tuvok = await insertCharacter({ name: "Tuvok" });
    const kira = await insertCharacter({ name: "Kira" });

    await createManualEvent(
      {
        date: "2399-11-02",
        title: "Konferenz von Khitomer",
        detail: null,
        category: "political",
        characterIds: [tuvok.id, kira.id],
      },
      user.id,
    );

    const events = await getTimeline(null);
    const event = events.find((e) => e.title === "Konferenz von Khitomer");
    expect(event!.people.sort()).toEqual(["Kira", "Tuvok"]);
  });

  it("räumt die Zuordnung mit dem Ereignis ab", async () => {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "Weg" });
    const id = await createManualEvent(
      {
        date: "2400-01-01",
        title: "Kurzlebig",
        detail: null,
        category: "other",
        characterIds: [figur.id],
      },
      user.id,
    );

    await deleteManualEvent(id, { userId: user.id, canModerate: false });
    expect(
      await sql`SELECT event_id FROM timeline_event_characters WHERE event_id = ${id}`,
    ).toHaveLength(0);
  });

  it("bietet auch zurückgezogene Figuren zur Auswahl an, aber keine Entwürfe", async () => {
    // Ein historisches Ereignis betrifft oft gerade die, die nicht mehr im
    // Dienst sind — Entwürfe sind dagegen noch gar nicht veröffentlicht.
    await insertCharacter({ name: "Aktiv" });
    const zurueckgezogen = await insertCharacter({ name: "Zurückgezogen" });
    const entwurf = await insertCharacter({ name: "Entwurf" });
    await sql`UPDATE characters SET status = 'retired' WHERE id = ${zurueckgezogen.id}`;
    await sql`UPDATE characters SET is_draft = true WHERE id = ${entwurf.id}`;

    const namen = (await listCharactersForEvents()).map((c) => c.name);
    expect(namen).toContain("Aktiv");
    expect(namen).toContain("Zurückgezogen");
    expect(namen).not.toContain("Entwurf");
  });
});

// Was in die Chronologie gehört und was nicht — zwei Regeln, die beim
// Zusammenlegen von Datenbank und Chronologie unter die Räder kamen.
describe("Chronologie: Umfang der Quellen", () => {
  it("führt ein LAUFENDES Gespräch nicht", async () => {
    // Ein offenes Gespräch ist kein abgeschlossenes Ereignis, und seine Karte
    // führte auf eine Seite, die alle außer den Beteiligten weiterleitet.
    const [offen] = await sql<{ slug: string }[]>`
      INSERT INTO archive_entries
        (slug, title, category, content, visibility, is_draft, dialogue_open,
         metadata, frontmatter)
      VALUES ('gespraech-offen', 'Laufendes Gespräch', 'dialogue', '',
              'public', false, true, ${sql.json({})}, ${sql.json({})})
      RETURNING slug
    `;
    const [zu] = await sql<{ slug: string }[]>`
      INSERT INTO archive_entries
        (slug, title, category, content, visibility, is_draft, dialogue_open,
         metadata, frontmatter)
      VALUES ('gespraech-zu', 'Abgeschlossenes Gespräch', 'dialogue', '',
              'public', false, false, ${sql.json({})}, ${sql.json({})})
      RETURNING slug
    `;

    const titles = (await getTimeline(null)).map((event) => event.title);
    expect(titles).not.toContain("Laufendes Gespräch");
    // Das abgeschlossene steht dort — auch ohne In-Story-Datum.
    expect(titles).toContain("Abgeschlossenes Gespräch");
    expect(offen.slug).toBe("gespraech-offen");
    expect(zu.slug).toBe("gespraech-zu");
  });

  it("führt ein Logbuch auch ohne Datum", async () => {
    // Das Datum ist am Logbuch optional. Ohne diese Regel zählte die
    // Charakterseite es unter „Logs", der Link dorthin zeigte es aber nicht.
    const mission = await insertMission();
    await sql`
      INSERT INTO mission_logs
        (slug, title, mission_id, content, visibility, is_draft, log_date)
      VALUES ('log-ohne-datum', 'Logbuch ohne Datum', ${mission.id}, '',
              'public', false, NULL)
    `;

    const event = (await getTimeline(null)).find(
      (e) => e.title === "Logbuch ohne Datum",
    );
    expect(event).toBeDefined();
    // Es steht in der Gruppe „Ohne Datum" am Ende (date === null).
    expect(event!.date).toBeNull();
    expect(event!.category).toBe("log");
  });
});

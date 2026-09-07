import { describe, it, expect, vi } from "vitest";
import sql from "@/lib/db";
import {
  createManualEvent,
  deleteManualEvent,
} from "@/lib/timelineManualEvents";
import { getTimeline } from "@/lib/timeline";
import { insertUser } from "./helpers";

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
      { date: "2400-01-01", title: "Weg damit", detail: null, category: "other" },
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
      { date: "2400-01-01", title: "Meins", detail: null, category: "other" },
      autor.id,
    );

    expect(
      await deleteManualEvent(id, { userId: fremd.id, canModerate: false }),
    ).toBe(false);
    expect(
      await deleteManualEvent(id, { userId: fremd.id, canModerate: true }),
    ).toBe(true);
  });
});

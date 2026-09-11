import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  isRagRateLimited,
  recordRagRequest,
  checkAndRecordRagRequest,
} from "@/lib/ragLimiter";
import { insertUser } from "./helpers";

// Spiegelt MAX_REQUESTS_PER_USER in src/lib/ragLimiter.ts.
const LIMIT = 8;

describe("isRagRateLimited", () => {
  it("lässt die ersten Anfragen im Fenster durch", async () => {
    const user = await insertUser();

    for (let i = 0; i < LIMIT - 1; i += 1) {
      await recordRagRequest(user.id);
    }

    expect(await isRagRateLimited(user.id)).toBe(false);
  });

  it("greift, sobald das Limit erreicht ist", async () => {
    const user = await insertUser();

    for (let i = 0; i < LIMIT; i += 1) {
      await recordRagRequest(user.id);
    }

    expect(await isRagRateLimited(user.id)).toBe(true);
  });

  it("zählt nur Anfragen innerhalb des Fensters", async () => {
    const user = await insertUser();
    for (let i = 0; i < LIMIT; i += 1) {
      await recordRagRequest(user.id);
    }
    await sql`
      UPDATE rag_requests
      SET requested_at = NOW() - INTERVAL '2 minutes'
      WHERE user_id = ${user.id}
    `;

    expect(await isRagRateLimited(user.id)).toBe(false);
  });

  it("zählt pro Person, nicht global", async () => {
    const eine = await insertUser();
    const andere = await insertUser();
    for (let i = 0; i < LIMIT; i += 1) {
      await recordRagRequest(eine.id);
    }

    expect(await isRagRateLimited(eine.id)).toBe(true);
    expect(await isRagRateLimited(andere.id)).toBe(false);
  });
});

describe("checkAndRecordRagRequest", () => {
  it("verbucht jede durchgelassene Anfrage und bremst dann", async () => {
    const user = await insertUser();

    const ergebnisse: boolean[] = [];
    for (let i = 0; i < LIMIT + 2; i += 1) {
      ergebnisse.push(await checkAndRecordRagRequest(user.id));
    }

    // Die ersten LIMIT gehen durch (false = nicht abgelehnt), danach wird
    // abgelehnt.
    expect(ergebnisse.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(false));
    expect(ergebnisse.slice(LIMIT)).toEqual([true, true]);
  });

  it("verbucht eine abgelehnte Anfrage nicht zusätzlich", async () => {
    const user = await insertUser();
    for (let i = 0; i < LIMIT + 3; i += 1) {
      await checkAndRecordRagRequest(user.id);
    }

    const [row] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM rag_requests WHERE user_id = ${user.id}
    `;
    expect(row.count).toBe(LIMIT);
  });

  // Der eigentliche Grund für den Advisory-Lock: parallel eintreffende
  // Anfragen dürfen den Zählerstand nicht gemeinsam unterlaufen.
  it("hält das Limit auch bei gleichzeitigen Anfragen ein", async () => {
    const user = await insertUser();

    const ergebnisse = await Promise.all(
      Array.from({ length: LIMIT + 4 }, () => checkAndRecordRagRequest(user.id)),
    );

    expect(ergebnisse.filter((abgelehnt) => !abgelehnt)).toHaveLength(LIMIT);
  });
});

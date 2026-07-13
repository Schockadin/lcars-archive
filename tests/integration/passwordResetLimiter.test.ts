import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  isPasswordResetRateLimited,
  recordPasswordResetRequest,
  withEmailResetLock,
} from "@/lib/passwordResetLimiter";

// MAX_REQUESTS_PER_EMAIL/MAX_REQUESTS_PER_IP sind private Konstanten (3 bzw.
// 10) — hier als dokumentiertes, stabiles Verhalten hinterlegt.
const MAX_REQUESTS_PER_EMAIL = 3;
const MAX_REQUESTS_PER_IP = 10;

describe("isPasswordResetRateLimited / recordPasswordResetRequest", () => {
  it("is not rate-limited for a fresh email with no prior requests", async () => {
    expect(await isPasswordResetRateLimited("nobody@example.test", null)).toBe(
      false,
    );
  });

  it("rate-limits after MAX_REQUESTS_PER_EMAIL requests, not before", async () => {
    const email = "flood-target@example.test";
    for (let i = 0; i < MAX_REQUESTS_PER_EMAIL - 1; i++) {
      await recordPasswordResetRequest(email, null);
    }
    expect(await isPasswordResetRateLimited(email, null)).toBe(false);

    await recordPasswordResetRequest(email, null);
    expect(await isPasswordResetRateLimited(email, null)).toBe(true);
  });

  it("rate-limits a brand-new email once its IP has hit MAX_REQUESTS_PER_IP requests", async () => {
    const ip = "203.0.113.77";
    for (let i = 0; i < MAX_REQUESTS_PER_IP; i++) {
      await recordPasswordResetRequest(`victim-${i}@example.test`, ip);
    }
    expect(
      await isPasswordResetRateLimited("never-seen-before@example.test", ip),
    ).toBe(true);
  });

  it("ignores the IP check when ip is null", async () => {
    expect(await isPasswordResetRateLimited("solo@example.test", null)).toBe(
      false,
    );
  });
});

describe("withEmailResetLock", () => {
  it("runs the callback inside a real transaction and persists its writes", async () => {
    const email = "tx-write@example.test";

    await withEmailResetLock(email, async (tx) => {
      await recordPasswordResetRequest(email, null, tx);
    });

    const rows = await sql`SELECT id FROM password_reset_requests WHERE email = ${email}`;
    expect(rows).toHaveLength(1);
  });

  it("returns the callback's result", async () => {
    const result = await withEmailResetLock("return-value@example.test", async () => "ok");
    expect(result).toBe("ok");
  });

  it("prevents a burst of concurrent requests for the same email from all slipping past the limit", async () => {
    // Ruft withEmailResetLock so auf, wie requestPasswordResetAction es tut:
    // prüfen+eintragen atomar innerhalb desselben Locks. Ohne den Lock könnte
    // ein Burst gleichzeitiger Anfragen alle denselben (noch nicht
    // aktualisierten) Zählerstand sehen und die Grenze gemeinsam
    // überschreiten.
    const email = "burst@example.test";
    const attempts = Array.from({ length: MAX_REQUESTS_PER_EMAIL + 5 }, () =>
      withEmailResetLock(email, async (tx) => {
        if (await isPasswordResetRateLimited(email, null, tx)) {
          return "limited" as const;
        }
        await recordPasswordResetRequest(email, null, tx);
        return "recorded" as const;
      }),
    );

    const results = await Promise.all(attempts);

    const recordedCount = results.filter((r) => r === "recorded").length;
    expect(recordedCount).toBe(MAX_REQUESTS_PER_EMAIL);

    const rows = await sql`SELECT id FROM password_reset_requests WHERE email = ${email}`;
    expect(rows).toHaveLength(MAX_REQUESTS_PER_EMAIL);
  });
});

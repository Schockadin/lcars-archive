import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createPasswordSetupToken,
  peekPasswordSetupToken,
  setPasswordWithSetupToken,
} from "@/lib/passwordSetupTokens";
import { setPassword } from "@/lib/users";
import { insertUser } from "./helpers";

describe("createPasswordSetupToken", () => {
  it("liefert einen Token, der sich prüfen lässt", async () => {
    const user = await insertUser();

    const raw = await createPasswordSetupToken(user.id);

    const token = await peekPasswordSetupToken(raw);
    expect(token?.userId).toBe(user.id);
  });

  it("entwertet die noch offenen Tokens desselben Kontos", async () => {
    const user = await insertUser();
    const alt = await createPasswordSetupToken(user.id);

    const neu = await createPasswordSetupToken(user.id);

    expect(await peekPasswordSetupToken(alt)).toBeNull();
    expect((await peekPasswordSetupToken(neu))?.userId).toBe(user.id);
  });

  it("lässt die Tokens anderer Konten unangetastet", async () => {
    const eine = await insertUser();
    const andere = await insertUser();
    const fremd = await createPasswordSetupToken(andere.id);

    await createPasswordSetupToken(eine.id);

    expect((await peekPasswordSetupToken(fremd))?.userId).toBe(andere.id);
  });

  it("lässt auch bei gleichzeitiger Anforderung nur einen Link gültig", async () => {
    const user = await insertUser();
    const tokens = await Promise.all([
      createPasswordSetupToken(user.id),
      createPasswordSetupToken(user.id),
    ]);
    const valid = await Promise.all(tokens.map(peekPasswordSetupToken));
    expect(valid.filter(Boolean)).toHaveLength(1);
  });
});

describe("peekPasswordSetupToken", () => {
  it("liefert null für einen verbrauchten Token", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    await setPasswordWithSetupToken(raw, "consumed-password-hash");

    expect(await peekPasswordSetupToken(raw)).toBeNull();
  });

  it("liefert null für einen abgelaufenen Token", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    await sql`
      UPDATE password_setup_tokens
      SET expires_at = NOW() - INTERVAL '1 hour'
      WHERE user_id = ${user.id}
    `;

    expect(await peekPasswordSetupToken(raw)).toBeNull();
  });

  it("liefert null für einen unbekannten Token", async () => {
    expect(await peekPasswordSetupToken("gibt-es-nicht")).toBeNull();
  });
});

describe("setPasswordWithSetupToken", () => {
  it("lässt bei paralleler Verwendung desselben Links genau einen Passwortwechsel zu", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    const hashes = ["first-password-hash", "second-password-hash"];
    const results = await Promise.all(
      hashes.map((hash) => setPasswordWithSetupToken(raw, hash)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const winner = results.findIndex(Boolean);
    const [saved] = await sql<
      { password_hash: string; session_version: number }[]
    >`
      SELECT password_hash, session_version FROM users WHERE id = ${user.id}
    `;
    expect(saved.password_hash).toBe(hashes[winner]);
    expect(saved.session_version).toBe(1);
    expect(results[winner]).toEqual({ userId: user.id, sessionVersion: 1 });
    expect(await peekPasswordSetupToken(raw)).toBeNull();
  });

  it("prüft die Gültigkeit nach einem zwischenzeitlichen Passwortwechsel erneut", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    expect(await peekPasswordSetupToken(raw)).not.toBeNull();
    await setPassword(user.id, "new-profile-password");

    expect(
      await setPasswordWithSetupToken(raw, "stale-recovery-password"),
    ).toBeNull();
    const [saved] = await sql<{ password_hash: string }[]>`
      SELECT password_hash FROM users WHERE id = ${user.id}
    `;
    expect(saved.password_hash).toBe("new-profile-password");
  });

  it("ändert für ein inzwischen deaktiviertes Konto weder Passwort noch Token", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    await sql`UPDATE users SET is_active = FALSE WHERE id = ${user.id}`;

    expect(
      await setPasswordWithSetupToken(raw, "forbidden-password"),
    ).toBeNull();
    const [saved] = await sql<
      { password_hash: string | null; session_version: number }[]
    >`
      SELECT password_hash, session_version FROM users WHERE id = ${user.id}
    `;
    expect(saved).toMatchObject({ password_hash: null, session_version: 0 });
    expect(await peekPasswordSetupToken(raw)).not.toBeNull();
  });

  it("verbraucht einen abgelaufenen Link nicht", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    await sql`UPDATE password_setup_tokens SET expires_at = NOW() - INTERVAL '1 hour' WHERE user_id = ${user.id}`;
    expect(await setPasswordWithSetupToken(raw, "expired-password")).toBeNull();
  });

  it("rollt Passwort und Tokenwiderruf gemeinsam zurück", async () => {
    const user = await insertUser({ passwordHash: "old-password" });
    const raw = await createPasswordSetupToken(user.id);
    await expect(
      sql.begin(async (tx) => {
        await setPassword(user.id, "rolled-back-password", tx);
        throw new Error("rollback-password-change");
      }),
    ).rejects.toThrow("rollback-password-change");

    const [saved] = await sql<
      { password_hash: string; session_version: number }[]
    >`
      SELECT password_hash, session_version FROM users WHERE id = ${user.id}
    `;
    expect(saved).toMatchObject({
      password_hash: "old-password",
      session_version: 0,
    });
    expect(await peekPasswordSetupToken(raw)).not.toBeNull();
  });
});

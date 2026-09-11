import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createPasswordSetupToken,
  peekPasswordSetupToken,
  markPasswordSetupTokenUsed,
} from "@/lib/passwordSetupTokens";
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
});

describe("peekPasswordSetupToken", () => {
  it("liefert null für einen verbrauchten Token", async () => {
    const user = await insertUser();
    const raw = await createPasswordSetupToken(user.id);
    const token = await peekPasswordSetupToken(raw);

    await markPasswordSetupTokenUsed(token!.id);

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

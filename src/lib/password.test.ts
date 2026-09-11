import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { promisify } from "node:util";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  DUMMY_PASSWORD_HASH,
} from "./password";

const scryptAsync = promisify(crypto.scrypt);

describe("validatePassword", () => {
  it("verlangt mindestens zehn Zeichen", () => {
    expect(validatePassword("kurz")).toMatch(/mindestens/i);
    expect(validatePassword("zehnzeichen")).toBeNull();
  });

  it("begrenzt nach oben", () => {
    expect(validatePassword("a".repeat(129))).toMatch(/höchstens/i);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("prüft ein frisch gesetztes Passwort", async () => {
    const stored = await hashPassword("ein langes testpasswort");
    expect(await verifyPassword("ein langes testpasswort", stored)).toBe(true);
    expect(await verifyPassword("ein anderes passwort", stored)).toBe(false);
  });

  it("schreibt die Kostenparameter in den gespeicherten Wert", async () => {
    const stored = await hashPassword("ein langes testpasswort");
    const [prefix, n, r, p] = stored.split("$");
    expect(prefix).toBe("scrypt");
    // Über den node:crypto-Vorgaben (N = 2^14, r = 8, p = 1).
    expect(Number(n)).toBeGreaterThan(1 << 14);
    expect(Number(r)).toBeGreaterThan(0);
    expect(Number(p)).toBeGreaterThan(0);
  });

  it("erzeugt für dasselbe Passwort zwei verschiedene Werte (eigenes Salt)", async () => {
    const a = await hashPassword("ein langes testpasswort");
    const b = await hashPassword("ein langes testpasswort");
    expect(a).not.toBe(b);
  });

  // Der eigentliche Punkt der Umstellung: bestehende Konten dürfen sich
  // weiter anmelden können, obwohl ihr Hash mit den alten Parametern
  // erzeugt wurde.
  it("prüft einen Hash im alten Format weiterhin korrekt", async () => {
    const salt = "a".repeat(32);
    const derived = (await scryptAsync("ein langes testpasswort", salt, 64)) as Buffer;
    const legacy = `${salt}:${derived.toString("hex")}`;

    expect(await verifyPassword("ein langes testpasswort", legacy)).toBe(true);
    expect(await verifyPassword("ein anderes passwort", legacy)).toBe(false);
  });

  it("lehnt unbrauchbar gespeicherte Werte ab, statt zu werfen", async () => {
    expect(await verifyPassword("egal", "")).toBe(false);
    expect(await verifyPassword("egal", "kein-trennzeichen")).toBe(false);
    expect(await verifyPassword("egal", "scrypt$0$8$1$aa$bb")).toBe(false);
  });
});

describe("DUMMY_PASSWORD_HASH", () => {
  it("trägt dieselben Kostenparameter wie ein frischer Hash", async () => {
    const real = await hashPassword("ein langes testpasswort");
    const [, n, r, p] = real.split("$");
    const [, dn, dr, dp] = DUMMY_PASSWORD_HASH.split("$");
    // Andernfalls wäre der Platzhalter-Vergleich messbar billiger als ein
    // echter — genau der Zeitkanal, den er schließen soll.
    expect([dn, dr, dp]).toEqual([n, r, p]);
  });

  it("passt auf kein Passwort", async () => {
    expect(await verifyPassword("irgendwas langes", DUMMY_PASSWORD_HASH)).toBe(false);
  });
});

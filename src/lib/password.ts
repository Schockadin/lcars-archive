import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

const MIN_LENGTH = 10;
const MAX_LENGTH = 128;

// Länge statt erzwungener Zeichenklassen — aktuelle Empfehlung (NIST
// 800-63B): lange Passwörter sind wirksamer als Komplexitätsregeln, die
// Nutzer nur zu vorhersehbaren Mustern verleiten.
export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_LENGTH} Zeichen lang sein.`;
  }
  if (password.length > MAX_LENGTH) {
    return `Das Passwort darf höchstens ${MAX_LENGTH} Zeichen lang sein.`;
  }
  return null;
}

// scrypt statt bcrypt/argon2: node:crypto ist bereits eingebunden (siehe
// src/lib/session.ts), keine zusätzliche Abhängigkeit nötig. Format
// "salt:hash", beides hex-kodiert.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, "hex");
  if (derived.length !== storedBuffer.length) return false;

  return crypto.timingSafeEqual(derived, storedBuffer);
}

// Platzhalter im selben "salt:hash"-Format wie hashPassword() (32 bzw. 128
// Hex-Zeichen), aber ohne Bezug zu einem echten Passwort. login/actions.ts
// vergleicht damit auch dann per verifyPassword(), wenn gar kein User (oder
// keiner mit gesetztem Passwort) existiert — sonst wäre die Antwortzeit für
// "Adresse unbekannt" messbar kürzer als für "falsches Passwort" (kein
// scrypt-Aufwand), was einem Angreifer verriete, welche Adressen registriert
// sind, selbst bei identischer Fehlermeldung.
export const DUMMY_PASSWORD_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

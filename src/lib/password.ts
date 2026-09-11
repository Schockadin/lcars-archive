import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";

// Explizit typisiert: promisify() greift für crypto.scrypt sonst die
// Überladung OHNE Options-Objekt, und genau das brauchen wir hier (N/r/p/
// maxmem, siehe unten).
const scryptAsync = promisify<
  crypto.BinaryLike,
  crypto.BinaryLike,
  number,
  crypto.ScryptOptions,
  Buffer
>(crypto.scrypt);
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

// Kostenparameter des Hashings. Bisher liefen alle Hashes mit den
// node:crypto-Vorgaben (N = 2^14, r = 8, p = 1) — das liegt unter der
// heutigen Empfehlung. Gewählt ist nun die von OWASP als gleichwertig
// geführte Variante (N = 2^16, r = 8, p = 2): sie vervierfacht den
// Speicherbedarf gegenüber der Vorgabe und verdoppelt zusätzlich die
// Rechenzeit, bleibt mit 64 MiB pro Hash aber deutlich unter der Variante
// N = 2^17 (128 MiB).
//
// Die Zurückhaltung beim Speicher hat einen konkreten Grund: Der
// Passwortvergleich beim Login läuft innerhalb der Transaktion von
// withEmailLoginLock (siehe loginAttempts.ts) und hält währenddessen eine
// der wenigen DB-Verbindungen (DB_POOL_MAX, Vorgabe 5). Je länger und
// speicherhungriger der Hash, desto teurer wird ein paralleler
// Anmeldeversuch für die gesamte Instanz.
const SCRYPT_N = 1 << 16;
const SCRYPT_R = 8;
const SCRYPT_P = 2;

// node:crypto lehnt Parameter ab, deren Speicherbedarf (128 * N * r) über
// maxmem liegt; die Vorgabe sind 32 MiB und damit zu wenig für N = 2^16.
// Mit Faktor 2 bleibt Luft, falls die Parameter später weiter steigen.
function maxmemFor(n: number, r: number): number {
  return 128 * n * r * 2;
}

// Gespeichertes Format:
//   neu:     "scrypt$<N>$<r>$<p>$<salt>$<hash>"  (salt/hash hex)
//   alt:     "<salt>:<hash>"                      (hex, implizit N=2^14,r=8,p=1)
//
// Die Parameter stehen im Hash selbst, damit sie sich später erhöhen lassen,
// ohne bestehende Passwörter zu entwerten: verifyPassword rechnet jeden Hash
// mit genau den Parametern nach, mit denen er erzeugt wurde. Bestehende
// Konten behalten ihren Alt-Hash, bis ihr Besitzer das nächste Mal ein
// Passwort setzt (Aktivierung, Reset oder Profil) — ein stiller
// Zwangs-Rehash beim Login wäre nur innerhalb der ohnehin knappen
// Login-Transaktion möglich (siehe oben) und ist den Aufwand hier nicht
// wert.
const SCRYPT_PREFIX = "scrypt";

interface ScryptParams {
  n: number;
  r: number;
  p: number;
}

const LEGACY_PARAMS: ScryptParams = { n: 1 << 14, r: 8, p: 1 };

async function derive(
  password: string,
  salt: string,
  params: ScryptParams,
): Promise<Buffer> {
  return scryptAsync(password, salt, KEY_LENGTH, {
    N: params.n,
    r: params.r,
    p: params.p,
    maxmem: maxmemFor(params.n, params.r),
  });
}

// scrypt statt bcrypt/argon2: node:crypto ist bereits eingebunden (siehe
// src/lib/session.ts), keine zusätzliche Abhängigkeit nötig.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const params: ScryptParams = { n: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P };
  const derived = await derive(password, salt, params);
  return [
    SCRYPT_PREFIX,
    params.n,
    params.r,
    params.p,
    salt,
    derived.toString("hex"),
  ].join("$");
}

// Zerlegt einen gespeicherten Wert in Salt, Hash und die Parameter, mit
// denen er erzeugt wurde. null, wenn der Wert keines der beiden Formate hat.
function parseStored(
  stored: string,
): { salt: string; hashHex: string; params: ScryptParams } | null {
  if (stored.startsWith(`${SCRYPT_PREFIX}$`)) {
    const [, n, r, p, salt, hashHex] = stored.split("$");
    const params = { n: Number(n), r: Number(r), p: Number(p) };
    if (
      !salt ||
      !hashHex ||
      !Number.isInteger(params.n) ||
      !Number.isInteger(params.r) ||
      !Number.isInteger(params.p) ||
      params.n <= 1 ||
      params.r <= 0 ||
      params.p <= 0
    ) {
      return null;
    }
    return { salt, hashHex, params };
  }

  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return null;
  return { salt, hashHex, params: LEGACY_PARAMS };
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) return false;

  const derived = await derive(password, parsed.salt, parsed.params);
  const storedBuffer = Buffer.from(parsed.hashHex, "hex");
  if (derived.length !== storedBuffer.length) return false;

  return crypto.timingSafeEqual(derived, storedBuffer);
}

// Platzhalter im AKTUELLEN Format (siehe hashPassword), aber ohne Bezug zu
// einem echten Passwort. login/actions.ts vergleicht damit auch dann per
// verifyPassword(), wenn gar kein User (oder keiner mit gesetztem Passwort)
// existiert — sonst wäre die Antwortzeit für "Adresse unbekannt" messbar
// kürzer als für "falsches Passwort" (kein scrypt-Aufwand), was einem
// Angreifer verriete, welche Adressen registriert sind, selbst bei
// identischer Fehlermeldung.
//
// Entscheidend: die Parameter hier müssen die AKTUELLEN sein. Stünde hier
// weiter das billigere Altformat, wäre der Platzhalter-Vergleich spürbar
// schneller als ein echter — und der Zeitkanal, den er schließen soll,
// wieder offen.
export const DUMMY_PASSWORD_HASH = [
  SCRYPT_PREFIX,
  SCRYPT_N,
  SCRYPT_R,
  SCRYPT_P,
  "0".repeat(32),
  "0".repeat(128),
].join("$");

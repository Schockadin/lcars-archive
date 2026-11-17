import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";
import { setPassword } from "@/lib/users";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Legt einen neuen Aktivierungs-Token an und gibt den Rohtoken zurück (nur
// dieser darf im Mail-Link stehen — in der DB liegt nur der Hash, siehe
// scripts/schema.sql).
//
// Dabei werden alle noch offenen Tokens desselben Kontos entwertet: Es gibt
// mehrere Wege, die einen Link erzeugen (Konto anlegen, „Passwort
// vergessen", und bei jedem Login-Versuch auf ein Konto ohne Passwort ein
// weiterer) — ohne diesen Schritt lägen schnell mehrere gleichzeitig
// gültige Links über sieben Tage in verschiedenen Postfächern. Nach dem
// Anfordern eines neuen Links soll genau einer funktionieren: der neueste.
//
// Beides in EINER Transaktion, damit nie ein Zustand entsteht, in dem die
// alten Tokens schon entwertet sind, der neue aber nicht angelegt wurde.
export async function createPasswordSetupToken(
  userId: number,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await sql.begin(async (tx) => {
    // Gleiche Sperrreihenfolge wie beim Passwortwechsel/Token-Verbrauch.
    // Auch zwei gleichzeitig angeforderte Links dürfen nur einen offenen
    // Token hinterlassen.
    await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    await tx`
      UPDATE password_setup_tokens
      SET used_at = NOW()
      WHERE user_id = ${userId} AND used_at IS NULL
    `;
    await tx`
      INSERT INTO password_setup_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${hashToken(rawToken)}, ${expiresAt})
    `;
  });

  return rawToken;
}

export interface ValidPasswordSetupToken {
  id: number;
  userId: number;
}

// Nur prüfen, nicht verbrauchen — für die GET-Seite (/activate), damit ein
// Reload des Formulars den Token nicht ungültig macht. Das eigentliche
// Verbrauchen und Passwortwechsel passieren gemeinsam in
// setPasswordWithSetupToken; ein GET allein darf den Link nicht entwerten.
export async function peekPasswordSetupToken(
  rawToken: string,
): Promise<ValidPasswordSetupToken | null> {
  const rows = await sql<{ id: number; user_id: number }[]>`
    SELECT id, user_id
    FROM password_setup_tokens
    WHERE token_hash = ${hashToken(rawToken)}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  return row ? { id: row.id, userId: row.user_id } : null;
}

export async function setPasswordWithSetupToken(
  rawToken: string,
  passwordHash: string,
): Promise<{ userId: number; sessionVersion: number } | null> {
  const tokenHash = hashToken(rawToken);
  return sql.begin(async (tx) => {
    // Zuerst das Konto sperren (wie setPassword/createPasswordSetupToken).
    // Die zweite Prüfung darunter sieht danach auch einen zwischenzeitlich
    // widerrufenen Token; gleichzeitige Anfragen können ihn nur einmal nutzen.
    const [user] = await tx<{ id: number }[]>`
      SELECT u.id FROM users u
      JOIN password_setup_tokens t ON t.user_id = u.id
      WHERE t.token_hash = ${tokenHash} AND u.is_active = TRUE
      FOR UPDATE OF u
    `;
    if (!user) return null;

    const [token] = await tx<{ id: number }[]>`
      UPDATE password_setup_tokens SET used_at = NOW()
      WHERE token_hash = ${tokenHash} AND user_id = ${user.id}
        AND used_at IS NULL AND expires_at > clock_timestamp()
      RETURNING id
    `;
    if (!token) return null;

    const sessionVersion = await setPassword(user.id, passwordHash, tx);
    return { userId: user.id, sessionVersion };
  });
}

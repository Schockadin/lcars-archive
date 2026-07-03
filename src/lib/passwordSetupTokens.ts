import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Legt einen neuen Aktivierungs-Token an und gibt den Rohtoken zurück (nur
// dieser darf im Mail-Link stehen — in der DB liegt nur der Hash, siehe
// scripts/schema.sql).
export async function createPasswordSetupToken(userId: number): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await sql`
    INSERT INTO password_setup_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashToken(rawToken)}, ${expiresAt})
  `;

  return rawToken;
}

export interface ValidPasswordSetupToken {
  id: number;
  userId: number;
}

// Nur prüfen, nicht verbrauchen — für die GET-Seite (/activate), damit ein
// Reload des Formulars den Token nicht ungültig macht. Das eigentliche
// Verbrauchen passiert erst in markPasswordSetupTokenUsed, nach
// erfolgreichem Passwort-Setzen.
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

export async function markPasswordSetupTokenUsed(id: number): Promise<void> {
  await sql`UPDATE password_setup_tokens SET used_at = NOW() WHERE id = ${id}`;
}

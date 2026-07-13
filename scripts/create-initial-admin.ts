// scripts/create-initial-admin.ts
//
// Legt einen ersten Admin-User an, aber NUR wenn die users-Tabelle noch
// komplett leer ist — für den Bootstrap einer frischen Datenbank, ohne
// dafür manuell INSERT-Statements schreiben zu müssen. Läuft absichtlich
// direkt gegen die DB (nicht über createUser() aus src/lib/users.ts), da
// createUser() immer requires_activation=true + kein Passwort setzt und
// eine Aktivierungsmail voraussetzt (RESEND_API_KEY) — beim allerersten
// Setup einer Umgebung ist das oft noch nicht konfiguriert.
//
// Läuft per `tsx` außerhalb von Next, braucht daher `--conditions=react-server`
// (siehe npm-Skript), damit das reale "server-only"-Package über seine
// "react-server"-Exportbedingung auf den No-op-Stub statt auf den werfenden
// Default-Export auflöst — exakt wie scripts/backup-db.ts.
import sql from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/password";
import { slugifyBase } from "@/lib/slug";
import crypto from "node:crypto";

async function main() {
  const [{ count }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM users
  `;
  if (Number(count) > 0) {
    console.log(
      `→ users-Tabelle enthält bereits ${count} Eintrag/Einträge — kein Admin angelegt.`,
    );
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  if (!email || !name) {
    console.error(
      "✗ ADMIN_EMAIL und ADMIN_NAME müssen gesetzt sein (siehe .env.example).",
    );
    process.exit(1);
  }

  // Ohne ADMIN_PASSWORD wird eins generiert und einmalig ausgegeben — beim
  // allerersten Setup gibt es noch keinen Login, über den man sich selbst
  // eins zuschicken könnte.
  const generatedPassword = crypto.randomBytes(12).toString("base64url");
  const password = process.env.ADMIN_PASSWORD || generatedPassword;

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(`✗ ADMIN_PASSWORD ungültig: ${passwordError}`);
    process.exit(1);
  }

  const slug = slugifyBase(name);
  const passwordHash = await hashPassword(password);

  await sql`
    INSERT INTO users (email, name, slug, role, is_active, requires_activation, password_hash)
    VALUES (${email}, ${name}, ${slug}, 'admin', true, false, ${passwordHash})
  `;

  console.log(`✓ Admin-User angelegt: ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      `  Generiertes Passwort (jetzt notieren, wird nicht erneut angezeigt): ${password}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("✗ Fehler:", error);
    process.exit(1);
  })
  .finally(() => sql.end());

// scripts/setup-db.ts
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setup() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to .env.local');
  }

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    onnotice: () => {},   // unterdrückt "table already exists"-Notices
  });

  console.log('🔌 Verbinde mit Datenbank...');

  try {
    // Schema aus separater SQL-Datei lesen
    const schema = readFileSync(
      join(process.cwd(), 'scripts', 'schema.sql'),
      'utf8'
    );

    console.log('📦 Erstelle Tabellen...');
    await sql.unsafe(schema);

    console.log('✓ Schema erfolgreich angelegt');
  } catch (error) {
    console.error('✗ Fehler beim Setup:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setup();
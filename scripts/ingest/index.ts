import postgres from 'postgres';
import { ingestCharacters } from './characters.js';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL ist nicht gesetzt');
  }

  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    throw new Error('VAULT_PATH ist nicht gesetzt');
  }

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  console.log('🚀 Starte Ingestion...');
  console.log(`📂 Vault: ${vaultPath}`);

  try {
    await ingestCharacters(sql, vaultPath);
    console.log('\n✅ Ingestion abgeschlossen');
  } catch (error) {
    console.error('\n❌ Fataler Fehler:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
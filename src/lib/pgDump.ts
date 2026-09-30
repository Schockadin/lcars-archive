export function getPgDatabaseUrl(
  env: Record<string, string | undefined>,
): string {
  const databaseUrl = env.DIRECT_DATABASE_URL || env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DIRECT_DATABASE_URL oder DATABASE_URL ist nicht gesetzt. Bitte die Verbindung in .env.local konfigurieren.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      "Die Datenbankverbindung ist keine gültige PostgreSQL-URL.",
    );
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Die PostgreSQL-URL muss mit postgres:// oder postgresql:// beginnen.");
  }

  return databaseUrl;
}

export function getPgDatabaseLabel(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  return database ? `${database} auf ${parsed.host}` : parsed.host;
}

export function buildPgDumpArgs(
  databaseUrl: string,
  outputPath: string,
): string[] {
  return [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file",
    outputPath,
    "--dbname",
    databaseUrl,
  ];
}

export function buildPgRestoreArgs(
  databaseUrl: string,
  inputPath: string,
): string[] {
  return [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "--exit-on-error",
    "--single-transaction",
    "--dbname",
    databaseUrl,
    inputPath,
  ];
}

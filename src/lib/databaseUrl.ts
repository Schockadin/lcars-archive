export function resolveDatabaseUrl(
  useNetlifyDatabase: boolean,
  databaseUrl: string | undefined,
  getNetlifyConnectionString: () => string,
): string {
  if (useNetlifyDatabase) return getNetlifyConnectionString();
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return databaseUrl;
}

export function resolveDatabaseUrl(
  useNetlifyDatabase: boolean,
  isProductionBuild: boolean,
  databaseUrl: string | undefined,
  getNetlifyConnectionString: () => string,
): string {
  // Netlify applies preview migrations after `next build`; pages statically
  // rendered during the build must still read the source database.
  if (useNetlifyDatabase && !isProductionBuild) {
    return getNetlifyConnectionString();
  }
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return databaseUrl;
}

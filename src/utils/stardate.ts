export function getStardate(): string {
  const now = new Date();
  
  // TNG-Formel: jedes Jahr = 1000 Stardate-Einheiten
  // Startpunkt: 1. Januar 2323 = Stardate 00000.0
  const START_YEAR = 2000;
  const start = new Date(START_YEAR, 0, 1).getTime();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  
  const stardate = ((now.getTime() - start) / msPerYear) * 1000;
  
  // Format: XXXXX.X
  return stardate.toFixed(1);
}
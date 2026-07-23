import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = global as unknown as { sql: postgres.Sql };

// Die App verbindet sich über pgBouncer (Transaction-Mode). Deshalb:
// - prepare: false → keine server-seitigen Prepared Statements; im
//   Transaction-Mode liegt jede Query potenziell auf einer anderen
//   Backend-Connection, wodurch Prepared Statements brechen würden.
// - moderate max-Pool-Größe, da pgBouncer das eigentliche Pooling übernimmt.
// - connect_timeout begrenzt hängende Verbindungsaufbauten (z.B. unter dem
//   parallelen Verbindungs-Burst beim Build), statt bis zum Default (30s) zu
//   warten und die 60s-Build-Grenze von Next zu reißen.

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL, {
    ssl: false,
    max: 1, // wichtig: 1 Verbindung pro Client
    idle_timeout: 20, // Sekunden, bevor eine ungenutzte Verbindung geschlossen wird
    connect_timeout: 10,
    prepare: false, // wichtig für Transaction Mode
  });

if (!globalForDb.sql) {
  globalForDb.sql = sql;
}

export default sql;

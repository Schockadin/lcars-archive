import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = global as unknown as { sql: postgres.Sql };

// Die App verbindet sich über pgBouncer (Transaction-Mode). Deshalb:
// - prepare: false → keine server-seitigen Prepared Statements; im
//   Transaction-Mode liegt jede Query potenziell auf einer anderen
//   Backend-Connection, wodurch Prepared Statements brechen würden.
// - max: mehrere Verbindungen pro Client, damit parallele Queries innerhalb
//   EINES Requests (die vielen Promise.all(...) in Dashboard/Suche/Stats/
//   Detailseiten) auch tatsächlich parallel laufen — mit max:1 stünden sie an
//   der einen Verbindung Schlange und wären trotz Promise.all seriell.
//   pgBouncer (Transaction-Mode) multiplext diese Verbindungen ohnehin auf
//   wenige echte Backend-Connections, daher unkritisch. Über DB_POOL_MAX
//   überschreibbar, falls die pgBouncer-/Postgres-Verbindungsgrenze das
//   erfordert.
// - connect_timeout begrenzt hängende Verbindungsaufbauten (z.B. unter dem
//   parallelen Verbindungs-Burst beim Build), statt bis zum Default (30s) zu
//   warten und die 60s-Build-Grenze von Next zu reißen.

const poolMax = Number(process.env.DB_POOL_MAX);

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL, {
    ssl: false,
    max: Number.isInteger(poolMax) && poolMax > 0 ? poolMax : 5,
    idle_timeout: 20, // Sekunden, bevor eine ungenutzte Verbindung geschlossen wird
    connect_timeout: 10,
    prepare: false, // wichtig für Transaction Mode
  });

if (!globalForDb.sql) {
  globalForDb.sql = sql;
}

export default sql;

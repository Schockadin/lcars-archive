import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = global as unknown as { sql: postgres.Sql };

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 10,
    idle_timeout: 30,
  });

// if (!globalForDb.sql) {
//   globalForDb.sql = sql;
// }

if (!globalForDb.sql) {
  globalForDb.sql = sql;
}

export default sql;

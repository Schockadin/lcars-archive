import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import sql from "@/lib/db";
import * as schema from "@/lib/ormSchema";

// Drizzle nutzt denselben postgres.js-Client samt prepare:false für PgBouncer.
// Keine zweite Verbindung und kein impliziter Schemaabgleich beim App-Start.
const orm = drizzle({ client: sql, schema });

export default orm;

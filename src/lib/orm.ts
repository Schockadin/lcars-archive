import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import sql from "@/lib/db";
import * as schema from "@/lib/ormSchema";

// Drizzle überschreibt beim Initialisieren einige Parser/Serializer in
// client.options. Das darf den alten SQL-Pfad nicht verändern: dort werden
// unter anderem sql.json(...) und Date-Parameter weiterverwendet.
// Der Proxy teilt Queries und Pool, aber gibt Drizzle eigene Optionen.
const drizzleOptions = {
  ...sql.options,
  parsers: { ...sql.options.parsers },
  serializers: { ...sql.options.serializers },
};
const drizzleClient = new Proxy(sql, {
  get(target, property, receiver) {
    if (property === "options") return drizzleOptions;
    return Reflect.get(target, property, receiver);
  },
});

// Der vorhandene Client behält prepare:false für PgBouncer.
const orm = drizzle({ client: drizzleClient, schema });

export default orm;

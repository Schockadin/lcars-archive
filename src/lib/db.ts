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
// - ssl kommt aus der Umgebung (s.u.).

const poolMax = Number(process.env.DB_POOL_MAX);

// TLS zur Datenbank. Stand bis zuletzt als festes `ssl: false` im Code — und
// das überschrieb auch ein `sslmode=require` in der DATABASE_URL: Selbst wer
// TLS in der Verbindungs-URL anforderte, bekam Klartext, einschließlich der
// Passwort-Hashes bei jedem Login. Unbedenklich ist das nur, solange
// pgBouncer im selben privaten Netz steht wie die Funktion; sobald die
// Verbindung das Netz verlässt, ist es ein offener Kanal.
//
// Jetzt entscheidet die DATABASE_URL: Ohne gesetztes DB_SSL wird die Option
// gar nicht übergeben, sodass postgres.js das `sslmode` der URL auswertet
// (kein sslmode ⇒ Klartext wie bisher, `?sslmode=require` ⇒ verschlüsselt,
// ohne Code-Änderung). DB_SSL bleibt als ausdrückliche Übersteuerung:
// "require" erzwingt Verschlüsselung ohne CA-Prüfung (was verwaltete
// Postgres-Anbieter mit eigenem Zertifikat erwarten), "false" erzwingt
// Klartext.
//
// Bewusst NICHT auf "require" als Vorgabe umgestellt: Ob die Gegenstelle
// TLS überhaupt anbietet, weiß nur der Betrieb — eine erzwungene
// Verschlüsselung gegen einen Server ohne TLS legt die gesamte App still.
// Die Entscheidung gehört damit in die Konfiguration, und genau dorthin ist
// sie jetzt verlegt (siehe .env.example).
function sslSetting(): "require" | false | undefined {
  if (process.env.DB_SSL === "false") return false;
  if (process.env.DB_SSL === "require") return "require";
  return undefined;
}

const ssl = sslSetting();

const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL, {
    // Nur übergeben, wenn ausdrücklich gesetzt — sonst entscheidet das
    // sslmode der DATABASE_URL (siehe sslSetting oben).
    ...(ssl === undefined ? {} : { ssl }),
    max: Number.isInteger(poolMax) && poolMax > 0 ? poolMax : 5,
    idle_timeout: 20, // Sekunden, bevor eine ungenutzte Verbindung geschlossen wird
    connect_timeout: 10,
    prepare: false, // wichtig für Transaction Mode
  });

if (!globalForDb.sql) {
  globalForDb.sql = sql;
}

export default sql;
